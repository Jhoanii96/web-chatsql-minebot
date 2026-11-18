import hashlib
import os
import bcrypt
import base64


class HashLib:
    def __init__(self, iterations: int = 100000):
        self.iterations = iterations

    def hash_password(self, password: str, salt: bytes = None) -> str:
        if salt is None:
            # Generate a random salt
            salt = os.urandom(16)
        # Use PBKDF2 to hash the password
        dk = hashlib.pbkdf2_hmac(
            'sha256', password.encode(), salt, self.iterations)
        # Combine the salt and the hashed password, then encode as base64
        return base64.b64encode(salt + dk).decode('utf-8')

    def verify_password(self, stored_password: str, provided_password: str) -> bool:
        # Decode the stored password from base64
        stored_password_bytes = base64.b64decode(stored_password)
        # Extract the salt from the stored password
        salt = stored_password_bytes[:16]
        # Extract the original hashed password
        original_hash = stored_password_bytes[16:]
        # Hash the provided password with the same salt and iterations
        new_hash = hashlib.pbkdf2_hmac(
            'sha256', provided_password.encode(), salt, self.iterations)
        # Compare the new hash with the original hash
        return new_hash == original_hash


# Example usage
"""
password_manager = HashLib()

password = "securepassword"
hashed_password = password_manager.hash_password(password)
print(f"Hashed password: {hashed_password}")

# Verifying the password
is_correct = password_manager.verify_password(hashed_password, password)
print(f"Password verification result: {is_correct}")
"""


class BCrypt:
    def __init__(self, rounds: int = 12):
        self.rounds = rounds

    def hash_password(self, password: str) -> str:
        salt = bcrypt.gensalt(rounds=self.rounds)
        hashed_password = bcrypt.hashpw(password.encode(), salt)
        return hashed_password.decode()

    def check_password(self, password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(password.encode(), hashed_password.encode())
