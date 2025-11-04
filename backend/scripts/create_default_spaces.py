"""
Wrapper para ejecutar el semillado definido en `backend/create_default_spaces.py`.

Se conserva este archivo para respetar la ruta documentada en README y scripts
externos (`python scripts/create_default_spaces.py`), pero toda la lógica vive
en `backend/create_default_spaces.py` para evitar duplicaciones que generaban
confusión al añadir o modificar espacios.
"""

import importlib
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
base_dir_str = str(BASE_DIR)
if base_dir_str not in sys.path:
    sys.path.insert(0, base_dir_str)

main = importlib.import_module("create_default_spaces").main  # noqa: E402


if __name__ == "__main__":
    main()
