# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
"""This module contains tools for working with Connection Strings"""

__all__ = ["ConnectionString"]

CS_DELIMITER = ";"
CS_VAL_SEPARATOR = "="

DEFAULT_ENDPOINTS_PROTOCOL = "DefaultEndpointsProtocol"
ACCOUNT_NAME = "AccountName"
ACCOUNT_KEY = "AccountKey"
ENDPOINT_SUFFIX = "EndpointSuffix"

_valid_keys = [
    DEFAULT_ENDPOINTS_PROTOCOL,
    ACCOUNT_NAME,
    ACCOUNT_KEY,
    ENDPOINT_SUFFIX,
]


def _parse_connection_string(connection_string):
    """Return a dictionary of values contained in a given connection string"""
    try:
        cs_args = connection_string.split(CS_DELIMITER)
    except (AttributeError, TypeError):
        raise TypeError("Connection String must be of type str")
    try:
        d = dict(arg.split(CS_VAL_SEPARATOR, 1) for arg in cs_args)
    except ValueError:
        # This occurs in an extreme edge case where a dictionary cannot be formed because there
        # is only 1 token after the split (dict requires two in order to make a key/value pair)
        raise ValueError("Invalid Connection String - Unable to parse")
    if len(cs_args) != len(d):
        # various errors related to incorrect parsing - duplicate args, bad syntax, etc.
        raise ValueError("Invalid Connection String - Unable to parse")
    if not all(key in _valid_keys for key in d.keys()):
        raise ValueError("Invalid Connection String - Invalid Key")
    _validate_keys(d)
    return d


def _validate_keys(d):
    """Raise ValueError if incorrect combination of keys in dict d"""
    account_name = d.get(ACCOUNT_NAME)
    account_key = d.get(ACCOUNT_KEY)

    # This logic could be expanded to return the category of ConnectionString
    if account_name and account_key:
        pass
    else:
        raise ValueError("Invalid Connection String - Incomplete")


class ConnectionString(object):
    """Key/value mappings for connection details.
    Uses the same syntax as dictionary
    """

    def __init__(self, connection_string):
        """Initializer for ConnectionString

        :param str connection_string: String with connection details provided by Azure
        :raises: ValueError if provided connection_string is invalid
        """
        self._dict = _parse_connection_string(connection_string)
        self._strrep = connection_string

    def __getitem__(self, key):
        return self._dict[key]

    def __repr__(self):
        return self._strrep

    def get(self, key, default=None):
        """Return the value for key if key is in the dictionary, else default

        :param str key: The key to retrieve a value for
        :param str default: The default value returned if a key is not found
        :returns: The value for the given key
        """
        try:
            return self._dict[key]
        except KeyError:
            return default
