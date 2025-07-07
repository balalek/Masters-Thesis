"""MongoDB database connection module.

This module establishes and validates a connection to the MongoDB database.
It exports:

- client: The MongoDB client instance connected to the cluster
- db: The primary database instance for the quiz application

The connection uses the MongoDB URI from the MONGODB_URI environment variable,
which should be set in the .env file or system environment.

Author: Bc. Martin Baláž
"""
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os

uri = os.getenv('MONGODB_URI')
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set")

client = MongoClient(uri, server_api=ServerApi('1'))
db = client.quiz_db

# Test connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")

except Exception as e:
    print(e)