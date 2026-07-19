from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from src.db.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String, nullable=False)

    file_path = Column(String, nullable=False)

    content_type = Column(String, nullable=True)

    size_bytes = Column(Integer, nullable=True)

    # ISO 639-1 code (e.g. "en", "hi") and a human-readable name, detected
    # from the extracted text at ingestion time. Powers the dual-language
    # answer feature.
    language_code = Column(String, nullable=True)

    language_name = Column(String, nullable=True)

    # For non-upload sources (website, GitHub file) -- where this came
    # from, shown in the UI so a user can tell "PDF I uploaded" apart
    # from "page I imported." Null for direct PDF/scan uploads.
    source_url = Column(String, nullable=True)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )

    owner_id = Column(Integer, ForeignKey("users.id"))

    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)

    owner = relationship(
        "User",
        back_populates="documents",
    )

    workspace = relationship("Workspace", back_populates="documents")
