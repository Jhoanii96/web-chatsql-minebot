import inspect
from routes.mainscript import save_system_error_log
from classes.sqlconnection import QueryExecutor
from flask import session, request, redirect, url_for
from environment import SQL_SCHEMA    

executor_instance = QueryExecutor() 

class TranslationManager:
    def __init__(self, default_language='en'):
        """
        Initializes the TranslationManager with a default language.
        
        :param default_language: Default language to use if no language is set in session.
        """
        self.default_language = default_language

    def load_translations(self, language):
        """
        Loads all translations for a given language into a dictionary.
        
        :param language: Language code (e.g., 'en', 'es').
        :return: A dictionary with translation keys and their respective translations.
        """
        query = f"""
        SELECT translation_key, translation
        FROM [{SQL_SCHEMA}].[translations]
        WHERE language = '{language}'
        """
        translations = dict()
        try:
            future_result = executor_instance.query_executor(query) 
            result = future_result.result() 
            data_object = result[0] 
            translations = {row["translation_key"]: row["translation"] for row in data_object} 
        except Exception as ex:
            print(ex) 
            raise Exception(str(ex))
        return translations 

    def set_language(self, lang_code):
        """
        Sets the language in the session.
        
        :param lang_code: The language code to set in the session (e.g., 'en', 'es').
        :return: A redirect to the previous page or the homepage.
        """
        session['lang'] = lang_code
        session.permanent = True  # Make session persistent across browser sessions
        return redirect(request.referrer or url_for('index'))

    def get_language(self):
        """
        Retrieves the currently selected language from the session.
        
        :return: The selected language code, or the default language if not set.
        """
        return session.get('lang', self.default_language)
    
    def inject_translations(self):
        """
        Loads all translations for the current language and injects them into the context.
        
        :return: A dictionary with the translations for use in templates.
        """
        lang = self.get_language()
        translations = self.load_translations(lang)
        return dict(translations=translations)
    
    def register_context_processor(self, app):
        """
        Registers a context processor to make translations available in all templates.
        
        :param app: The Flask application instance.
        """
        @app.context_processor
        def inject_translations():
            return self.inject_translations()