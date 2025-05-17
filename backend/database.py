from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os
from dotenv import load_dotenv

load_dotenv()

# Use the connection string from docker-compose
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)

    # Define relationships for both outgoing and incoming edges
    outgoing_edges = relationship(
        "Edge", foreign_keys="Edge.source_id", back_populates="source"
    )
    incoming_edges = relationship(
        "Edge", foreign_keys="Edge.target_id", back_populates="target"
    )


class Edge(Base):
    __tablename__ = "edges"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("nodes.id"))
    target_id = Column(Integer, ForeignKey("nodes.id"))
    weight = Column(Float)

    source = relationship(
        "Node", foreign_keys=[source_id], back_populates="outgoing_edges"
    )
    target = relationship(
        "Node", foreign_keys=[target_id], back_populates="incoming_edges"
    )


# Create all tables
Base.metadata.create_all(bind=engine)


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
