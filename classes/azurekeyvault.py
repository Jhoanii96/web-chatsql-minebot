import logging
import inspect
from typing import List, Optional
from azure.identity import (
    ChainedTokenCredential,
    ManagedIdentityCredential,
    ClientSecretCredential,
    DefaultAzureCredential,
    AzureAuthorityHosts,
    InteractiveBrowserCredential
)
from routes.mainscript import save_system_error_log
from azure.keyvault.secrets import SecretClient
from azure.core.exceptions import ClientAuthenticationError, HttpResponseError
from environment import KEYVAULT_URL, AD_TENANT_ID, AD_CLIENT_ID, AD_CLIENT_SECRET

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

class AzureKeyVaultManager:
    """
    Securely manages Azure credentials using credential chaining and retrieves secrets from Azure Key Vault.
    Implements robust fallback authentication mechanisms with detailed error handling.

    Args:
        keyvault_url (str): URL of the Azure Key Vault
        tenant_id (str, optional): Azure AD tenant ID
        client_id (str, optional): Application/client ID
        client_secret (str, optional): Client secret
        use_managed_identity (bool): Enable Managed Identity auth (default: True)
        use_interactive_auth (bool): Enable interactive browser auth (default: False)
        cloud_environment (str): Azure cloud environment ('public', 'usgov', 'china', 'german')
    """

    def __init__(
        self,
        use_managed_identity: bool = True,
        use_interactive_auth: bool = False,
        cloud_environment: str = 'public'
    ):
        self.keyvault_url = KEYVAULT_URL
        self.tenant_id = AD_TENANT_ID
        self.client_id = AD_CLIENT_ID
        self.client_secret = AD_CLIENT_SECRET
        self.use_managed_identity = use_managed_identity
        self.use_interactive_auth = use_interactive_auth
        self.cloud_environment = cloud_environment.lower()
        self._secret_client = None
        self._credential_chain = None
        
        # Validate Key Vault URL format
        if not self.keyvault_url.startswith('https://'):
            raise ValueError("Key Vault URL must use HTTPS protocol")
        
        # Map cloud environments to authority hosts
        self.CLOUD_ENVS = {
            'public': AzureAuthorityHosts.AZURE_PUBLIC_CLOUD,
            'usgov': AzureAuthorityHosts.AZURE_GOVERNMENT,
            'china': AzureAuthorityHosts.AZURE_CHINA,
            'german': AzureAuthorityHosts.AZURE_GERMANY
        }
        
        if self.cloud_environment not in self.CLOUD_ENVS:
            raise ValueError(f"Unsupported cloud environment. Valid options: {list(self.CLOUD_ENVS.keys())}")

    def _build_credential_chain(self) -> ChainedTokenCredential:
        """Constructs authentication chain with fallback credentials"""
        authority = self.CLOUD_ENVS[self.cloud_environment]
        credentials = []
        
        # 1. Managed Identity (for Azure-hosted environments)
        if self.use_managed_identity:
            try:
                logger.debug("Adding Managed Identity credential")
                credentials.append(ManagedIdentityCredential(client_id=self.client_id))
            except Exception as ex:
                logger.warning("ManagedIdentity setup warning: %s", str(ex))
        
        # 2. Service Principal (explicit credentials)
        if all([self.tenant_id, self.client_id, self.client_secret]):
            try:
                logger.debug("Adding Service Principal credential")
                credentials.append(ClientSecretCredential(
                    tenant_id=self.tenant_id,
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    authority=authority
                ))
            except Exception as ex:
                logger.error("Service Principal setup failed: %s", str(ex))
        
        # 3. Interactive Browser (for local development)
        if self.use_interactive_auth:
            try:
                logger.debug("Adding Interactive Browser credential")
                credentials.append(InteractiveBrowserCredential(
                    tenant_id=self.tenant_id,
                    client_id=self.client_id,
                    authority=authority
                ))
            except Exception as ex:
                logger.error("Interactive auth setup failed: %s", str(ex))
        
        # 4. Default Azure Credential (fallback with multiple methods)
        try:
            logger.debug("Adding Default Azure Credential")
            credentials.append(DefaultAzureCredential(
                authority=authority,
                exclude_managed_identity_credential=not self.use_managed_identity,
                exclude_environment_credential=bool(self.client_secret)
            ))
        except Exception as ex:
            logger.error("Default credential setup failed: %s", str(ex))
        
        if not credentials:
            raise ClientAuthenticationError("No valid authentication methods configured")
        
        return ChainedTokenCredential(*credentials)

    @property
    def credentials(self) -> ChainedTokenCredential:
        """Lazy-loading credential chain with automatic retry capability"""
        if self._credential_chain is None:
            logger.info("Building credential chain with %d methods", 
                        [type(c).__name__ for c in self._build_credential_chain().credentials])
            self._credential_chain = self._build_credential_chain()
        return self._credential_chain

    @property
    def secret_client(self) -> SecretClient:
        """Lazy-loading Key Vault Secret Client"""
        if self._secret_client is None:
            self._secret_client = SecretClient(
                vault_url=self.keyvault_url,
                credential=self.credentials,
                logging_enable=False  # Disable built-in logging
            )
            logger.info("SecretClient initialized for Key Vault: %s", self.keyvault_url)
        return self._secret_client

    def get_secret(self, secret_name: str, version: Optional[str] = None) -> str:
        """
        Retrieves a secret from Azure Key Vault with comprehensive error handling
        
        Args:
            secret_name (str): Name of the secret
            version (str, optional): Specific version of the secret
            
        Returns:
            str: Secret value
            
        Raises:
            KeyVaultError: For Key Vault access failures
            ValueError: For invalid inputs
        """
        if not secret_name.strip():
            raise ValueError("Secret name cannot be empty or whitespace")
        
        try:
            logger.info("Retrieving secret: '%s' (version: %s)", 
                       secret_name, version or "latest")
            
            secret = self.secret_client.get_secret(secret_name, version=version)
            
            # Audit secret retrieval (without logging value)
            logger.info("Secret '%s' retrieved successfully (version: %s)", 
                       secret_name, secret.properties.version)
            
            return secret.value
        
        except ClientAuthenticationError as auth_error:
            logger.critical("Authentication failed: %s", auth_error.message)
            raise KeyVaultError("All authentication methods failed") from auth_error
        
        except HttpResponseError as kv_error:
            status_code = kv_error.status_code
            if status_code == 403:
                logger.error("Permission denied to Key Vault. Check RBAC settings.")
            elif status_code == 404:
                logger.error("Secret not found: %s", secret_name)
            else:
                logger.error("Key Vault API error [%d]: %s", 
                           status_code, kv_error.message.split('\n')[0])
            raise KeyVaultError(f"Key Vault operation failed ({status_code})") from kv_error
        
        except Exception as unexpected_error:
            logger.exception("Unhandled exception retrieving secret: %s", secret_name)
            raise KeyVaultError("Critical key vault access failure") from unexpected_error

class KeyVaultError(Exception):
    """Custom exception for Key Vault operations with chained exceptions"""
    pass