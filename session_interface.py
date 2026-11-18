# session_interface.py

from flask.sessions import SessionInterface, SessionMixin
from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
from uuid import uuid4
import pickle
from app import db  # Assuming `db` is imported from your main app file
from environment import SQL_SCHEMA

class Session(db.Model):
    __tablename__ = 'sessions'  # Table name
    __table_args__ = {'schema': SQL_SCHEMA}  # Specify schema
    
    id = Column(String(255), primary_key=True)
    data = Column(Text)
    expiry = Column(DateTime)

class SqlAlchemySession(SessionMixin):
    def __init__(self, session_id, data):
        self.id = session_id
        self.data = data or {}

class SqlAlchemySessionInterface(SessionInterface):
    def open_session(self, app, request):
        session_id = request.cookies.get(app.session_cookie_name)
        if session_id:
            stored_session = Session.query.get(session_id)
            if stored_session and stored_session.expiry > datetime.utcnow():
                data = pickle.loads(stored_session.data)
                return SqlAlchemySession(session_id, data)
        session_id = str(uuid4())
        return SqlAlchemySession(session_id, {})

    def save_session(self, app, session, response):
        if not session:
            stored_session = Session.query.get(session.id)
            if stored_session:
                db.session.delete(stored_session)
                db.session.commit()
            response.delete_cookie(app.session_cookie_name)
            return

        expiry = datetime.utcnow() + app.permanent_session_lifetime
        session_data = pickle.dumps(dict(session))
        stored_session = Session.query.get(session.id)

        if not stored_session:
            stored_session = Session(id=session.id, data=session_data, expiry=expiry)
            db.session.add(stored_session)
        else:
            stored_session.data = session_data
            stored_session.expiry = expiry

        db.session.commit()
        response.set_cookie(app.session_cookie_name, session.id, httponly=True, expires=expiry)
