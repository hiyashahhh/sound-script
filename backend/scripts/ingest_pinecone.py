"""Create the Pinecone index (if missing) and upsert all knowledge chunks. Run from backend/: python -m scripts.ingest_pinecone"""
import os, time
from dotenv import load_dotenv
load_dotenv()
from pinecone import Pinecone, ServerlessSpec
from app.rag.ingest import load_chunks
from app.rag.store import PineconeStore, DIM

name = os.getenv("PINECONE_INDEX", "soundscript")
pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
if name not in pc.list_indexes().names():
    pc.create_index(name=name, dimension=DIM, metric="cosine", spec=ServerlessSpec(cloud="aws", region="us-east-1"))
while not pc.describe_index(name).status["ready"]:  # a new serverless index takes a few seconds
    time.sleep(1)
chunks = load_chunks()
PineconeStore().upsert(chunks)
print(f"Upserted {len(chunks)} chunks into '{name}'")
