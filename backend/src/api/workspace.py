from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.dependencies.auth import get_current_user
from src.models.user import User

from src.schemas.team import WorkspaceCreate, WorkspaceResponse, AssignDocumentRequest
from src.schemas.document import DocumentResponse
from src.services.workspace_service import (
    create_workspace, list_my_workspaces, assign_document, remove_document,
    list_workspace_documents,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post("/", response_model=WorkspaceResponse)
def create(
    body: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = create_workspace(db, body.name, current_user, team_id=body.team_id)
    return {
        "id": ws.id, "name": ws.name, "owner_id": ws.owner_id,
        "team_id": ws.team_id, "document_count": 0, "created_at": ws.created_at,
    }


@router.get("/", response_model=list[WorkspaceResponse])
def list_mine(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_my_workspaces(db, current_user)


@router.post("/{workspace_id}/documents")
def add_document(
    workspace_id: int,
    body: AssignDocumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return assign_document(db, workspace_id, body.document_id, current_user)


@router.delete("/{workspace_id}/documents/{document_id}")
def delete_document(
    workspace_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return remove_document(db, workspace_id, document_id, current_user)


@router.get("/{workspace_id}/documents", response_model=list[DocumentResponse])
def list_documents(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_workspace_documents(db, workspace_id, current_user)
