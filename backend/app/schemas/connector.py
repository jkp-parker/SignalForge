from datetime import datetime

from pydantic import BaseModel


class ConnectorBase(BaseModel):
    name: str
    connector_type: str
    description: str = ""
    host: str
    port: int = 8088
    credentials: dict = {}
    connection_params: dict = {}
    polling_interval: int = 30
    alarm_filters: dict = {}
    label_mappings: dict = {}
    enabled: bool = True


class ConnectorCreate(ConnectorBase):
    pass


class ConnectorUpdate(BaseModel):
    name: str | None = None
    connector_type: str | None = None
    description: str | None = None
    host: str | None = None
    port: int | None = None
    credentials: dict | None = None
    connection_params: dict | None = None
    polling_interval: int | None = None
    alarm_filters: dict | None = None
    label_mappings: dict | None = None
    enabled: bool | None = None


class ConnectorResponse(ConnectorBase):
    id: str
    status: str
    last_successful_pull: datetime | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectorTestResult(BaseModel):
    success: bool
    message: str
    connection_ms: float | None = None
    sample_records: list[dict] | None = None
    normalized_preview: list[dict] | None = None
    note: str | None = None
