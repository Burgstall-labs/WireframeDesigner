---
description: Modern Python development practices with type hints, testing, and AI-friendly patterns
globs: **/*.py, **/pyproject.toml, **/requirements.txt, **/.env*
---

# Python Development

// Description: Modern Python development practices with type hints, testing, and AI-friendly patterns
// Recommended Globs: **/*.py, **/pyproject.toml, **/requirements.txt, **/.env*

## Project Structure
```
project_name/
├── src/
│   └── project_name/
│       ├── __init__.py
│       ├── models/
│       ├── services/
│       ├── controllers/
│       └── utils/
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── docs/
├── .env
├── .env.example
├── .gitignore
├── pyproject.toml
├── README.md
└── requirements.txt
```

## Type Annotations
Always use type hints for functions and classes:

```python
from typing import Optional, List, Dict, Any, TypeVar, Generic
from typing_extensions import TypedDict  # For Python <3.8

T = TypeVar('T')

class DataResponse(TypedDict):
    success: bool
    data: Dict[str, Any]
    error: Optional[str]

class Repository(Generic[T]):
    """Generic repository pattern implementation.

    Args:
        model: The model class this repository handles

    Attributes:
        model_class: Stored model class reference
    """

    def __init__(self, model: type[T]) -> None:
        self.model_class = model

    async def find_by_id(self, id: str) -> Optional[T]:
        """Retrieve an entity by its ID.

        Args:
            id: The unique identifier of the entity

        Returns:
            Optional[T]: The found entity or None
        """
        # Implementation
        ...
```

## Testing with Pytest
Use pytest fixtures and type annotations in tests:

```python
from typing import TYPE_CHECKING, AsyncGenerator
import pytest
from httpx import AsyncClient

if TYPE_CHECKING:
    from _pytest.capture import CaptureFixture
    from _pytest.fixtures import FixtureRequest
    from _pytest.logging import LogCaptureFixture
    from _pytest.monkeypatch import MonkeyPatch
    from pytest_mock.plugin import MockerFixture

@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create async test client.

    Yields:
        AsyncClient: The test client instance
    """
    async with AsyncClient() as client:
        yield client

@pytest.mark.asyncio
async def test_create_user(
    client: AsyncClient,
    mocker: MockerFixture,
    caplog: LogCaptureFixture,
) -> None:
    """Test user creation endpoint.

    Args:
        client: The test client
        mocker: Pytest mocker fixture
        caplog: Pytest log capture fixture
    """
    response = await client.post('/users', json={
        'username': 'test_user',
        'email': 'test@example.com'
    })
    
    assert response.status_code == 201
    assert 'User created successfully' in caplog.text
```

## Environment Configuration
Use environment variables with type validation:

```python
from typing import Optional
from pydantic import BaseSettings, SecretStr

class Settings(BaseSettings):
    """Application settings with environment variable validation.

    Attributes:
        app_name: Name of the application
        database_url: Database connection string
        api_key: Secret API key
        debug: Debug mode flag
    """
    app_name: str
    database_url: str
    api_key: SecretStr
    debug: bool = False

    class Config:
        env_file = '.env'
```

## Error Handling
Implement structured error handling with context:

```python
from typing import Optional, Any
from contextlib import contextmanager
import logging
import traceback

logger = logging.getLogger(__name__)

class AppError(Exception):
    """Base application error with context.

    Args:
        message: Error description
        context: Additional error context
    """
    def __init__(self, message: str, context: Optional[dict[str, Any]] = None) -> None:
        self.message = message
        self.context = context or {}
        super().__init__(self.message)

@contextmanager
def error_handler(operation: str) -> Any:
    """Context manager for standardized error handling.

    Args:
        operation: Description of the operation being performed

    Raises:
        AppError: Wrapped application error
    """
    try:
        yield
    except Exception as e:
        logger.error(
            f'Error during {operation}: {str(e)}\n{traceback.format_exc()}'
        )
        raise AppError(
            f'Failed to {operation}',
            {'error_type': type(e).__name__, 'details': str(e)}
        )
```

## Dependency Management
Use `uv` for faster package management:

```toml
# pyproject.toml
[project]
name = 'project_name'
version = '0.1.0'
description = 'Project description'
requires-python = '>=3.8'

[tool.ruff]
line-length = 88
target-version = 'py38'
select = [
    'E',   # pycodestyle errors
    'W',   # pycodestyle warnings
    'F',   # pyflakes
    'I',   # isort
    'D',   # pydocstyle
]

[tool.pytest.ini_options]
testpaths = ['tests']
python_files = ['test_*.py']
addopts = '-v --cov=src --cov-report=term-missing'
```

## CI/CD Configuration
GitHub Actions workflow example:

```yaml
# .github/workflows/python-app.yml
name: Python application

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.8'
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install uv
        uv pip install -r requirements.txt
    - name: Lint with ruff
      run: |
        ruff check .
    - name: Test with pytest
      run: |
        pytest
```

## Best Practices

### Documentation
- Use PEP 257 docstring conventions
- Document all public functions, classes, and modules
- Include type hints in docstrings for better AI assistance
- Keep README.md up to date with setup and usage instructions

### Code Organization
- One class per file (with rare exceptions)
- Group related functionality in modules
- Use `__init__.py` for package-level imports
- Keep circular dependencies out

### Testing
- Write tests first (TDD when possible)
- Use pytest fixtures for reusable test components
- Mock external dependencies
- Test both success and error cases

### AI-Friendly Practices
- Use descriptive variable names
- Keep functions focused and small
- Add type hints for better code completion
- Include examples in docstrings

## Resources
- [Python Type Hints](https://docs.python.org/3/library/typing.html)
- [pytest Documentation](https://docs.pytest.org/)
- [Ruff Documentation](https://beta.ruff.rs/docs/)
- [uv Package Manager](https://github.com/astral-sh/uv)
- [pydantic Documentation](https://docs.pydantic.dev/)