from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.workspace import Workspace
from src.models.document import Document
from src.models.user import User
from src.services.team_service import get_membership


def user_can_access_workspace(db: Session, workspace: Workspace, user: User) -> bool:
    if workspace.owner_id is not None:
        return workspace.owner_id == user.id
    if workspace.team_id is not None:
        return get_membership(db, workspace.team_id, user.id) is not None
    return False


def _get_owned_or_member_workspace(db: Session, workspace_id: int, user: User) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace or not user_can_access_workspace(db, workspace, user):
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return workspace


def create_workspace(db: Session, name: str, user: User, team_id: int | None = None):
    if team_id is not None:
        if not get_membership(db, team_id, user.id):
            raise HTTPException(status_code=403, detail="You're not a member of that team.")
        workspace = Workspace(name=name, team_id=team_id, owner_id=None)
    else:
        workspace = Workspace(name=name, owner_id=user.id, team_id=None)

    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


def list_my_workspaces(db: Session, user: User):
    personal = db.query(Workspace).filter(Workspace.owner_id == user.id).all()

    from src.models.team import TeamMembership
    team_ids = [
        m.team_id for m in
        db.query(TeamMembership).filter(TeamMembership.user_id == user.id).all()
    ]
    team_owned = (
        db.query(Workspace).filter(Workspace.team_id.in_(team_ids)).all()
        if team_ids else []
    )

    workspaces = personal + team_owned
    results = []
    for ws in workspaces:
        count = db.query(Document).filter(Document.workspace_id == ws.id).count()
        results.append({
            "id": ws.id, "name": ws.name, "owner_id": ws.owner_id,
            "team_id": ws.team_id, "document_count": count, "created_at": ws.created_at,
        })
    return results


def assign_document(db: Session, workspace_id: int, document_id: int, user: User):
    workspace = _get_owned_or_member_workspace(db, workspace_id, user)

    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.owner_id == user.id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    document.workspace_id = workspace.id
    db.commit()
    return {"message": f"Added '{document.filename}' to workspace '{workspace.name}'."}


def remove_document(db: Session, workspace_id: int, document_id: int, user: User):
    workspace = _get_owned_or_member_workspace(db, workspace_id, user)

    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.workspace_id == workspace.id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not in this workspace.")

    document.workspace_id = None
    db.commit()
    return {"message": "Removed from workspace."}


def get_workspace_document_ids(db: Session, workspace_id: int, user: User) -> list[int]:
    workspace = _get_owned_or_member_workspace(db, workspace_id, user)
    docs = db.query(Document).filter(Document.workspace_id == workspace.id).all()
    return [d.id for d in docs]


def list_workspace_documents(db: Session, workspace_id: int, user: User):
    workspace = _get_owned_or_member_workspace(db, workspace_id, user)
    return db.query(Document).filter(Document.workspace_id == workspace.id).all()
