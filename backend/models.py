# Import models so SQLAlchemy creates the tables
from backend.models.user import User  # noqa: F401, E402
from backend.models.chat_message import ChatMessage  # noqa: F401, E402
from backend.models.session import Session  # noqa: F401, E402
