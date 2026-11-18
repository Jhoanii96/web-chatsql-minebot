import os 
import uuid 
import pinecone 
from langchain_pinecone import PineconeVectorStore 
from langchain_community.vectorstores import Pinecone 
from langchain_core.documents import Document
from functions.openai import openai_embedding, get_openai_embedding 
from environment import PINECONE_KEY, PINECONE_INDEX 

class PineconeHandler:
    def __init__(self):
        self.api_key = PINECONE_KEY
        self.index_name = PINECONE_INDEX
        self.index = None

    def initialize(self):
        pc = pinecone.Pinecone(api_key=self.api_key) 
        self.index = pc.Index(self.index_name) 
        os.environ['PINECONE_API_KEY'] = PINECONE_KEY 

    def pinecone_query(self, openai_object, question, documents_name, num_result=10):
        self.initialize()
        
        openai_object["input"] = question
        with openai_embedding(**openai_object) as response:
            query_embedding = response.data[0].embedding 
        
        if documents_name == "All":
            results = self.index.query(vector=query_embedding, top_k=num_result, include_metadata=True)
        else:
            results = self.index.query(vector=query_embedding, top_k=num_result, namespace=documents_name, include_metadata=True)
        
        return self._format_results(results)

    def _format_results(self, results):
        all_results = ''
        filename = []
        pdfpagenum = []

        for match in results["matches"]:
            all_results += "\n--------------------------------------------------------------\n"
            if 'File Name' in match["metadata"]:
                all_results += f"Source document: [{match['metadata']['File Name']}] \n"
                filename.append(str(match["metadata"]["File Name"]))
            if 'Page Number' in match["metadata"]:
                all_results += f"Index page number: {int(match['metadata']['Page Number'])}: \n"
                pdfpagenum.append(str(int(match["metadata"]["Page Number"])))
            all_results += f"Text: {match['metadata']['text']}\n"

        all_results += "\nSources: " + ",".join(list(set(filename)))
        all_results += "\nIndex page number: " + ",".join(list(set(pdfpagenum)))
        
        return all_results

    def list_namespaces(self):
        self.initialize()
        data_namespace = self.index.describe_index_stats()['namespaces']

        list_namespace = [{'namespace': key, 'converted': key} for key in data_namespace.keys()]
        list_namespace.sort(key=lambda x: x['converted'], reverse=False)

        return list_namespace

    def delete_namespace(self, namespace_name):
        self.initialize()
        self.index.delete(delete_all=True, namespace=namespace_name)
        self.index.delete(filter={"filename": {"$eq": f"{namespace_name}.pdf"}}) 

    def upload_vector_documents(self, openai_object, pages, metadata=None, namespace=None):
        self.initialize()
        embeddings = get_openai_embedding(**openai_object) 
        # Create vectorstore object 
        #vectorstore = Pinecone(self.index, embeddings) 

        # Add texts and embeddings to Pinecone
        #vectorstore.add_texts(texts=[t.extract_text() for t in pages], metadatas=metadata)
        
        vector_store = PineconeVectorStore(index=self.index, index_name=self.index_name, embedding=embeddings, namespace=namespace)
        uuids = [str(uuid.uuid4()) for _ in range(len(pages))]
        documents = [
            Document(
                page_content=t.extract_text(),  # Extract text from the page
                metadata=metadata[idx]  # Assign corresponding metadata
            )
            for idx, t in enumerate(pages)
        ]
        vector_store.add_documents(documents=documents, ids=uuids, async_req=True) 
        #Pinecone.from_texts(
        #    [t.extract_text() for t in pages], 
        #    embeddings, 
        #    index_name=self.index_name, 
        #    metadatas=metadata, 
        #    namespace=namespace   
        #)
        #PineconeVectorStore.from_texts(
        #    [t.extract_text() for t in pages],
        #    embeddings,
        #    index_name=self.index_name,
        #    metadatas=metadata, 
        #    namespace=namespace, 
        #    pinecone_api_key=PINECONE_KEY
        #)

    def GetNamespaces(self) -> list[str]:
        self.initialize()
        data_namespace = self.index.describe_index_stats()['namespaces']
        list_namespace = [] 
        for key, value in data_namespace.items():
            data = {}
            data['namespace'] = key 
            data['converted'] = key 
            list_namespace.append(data) 
        list_namespace.sort(key=lambda x: x['converted'], reverse = False) 
        return list_namespace 

