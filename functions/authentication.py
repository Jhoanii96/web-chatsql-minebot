from flask import redirect, url_for, session
from functools import wraps  

def requires_auth(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        if not session.get("user") or not session.get("id_session"):
            return redirect(url_for("app_login.login")) 
        return func(*args, **kwargs)
    return decorated 