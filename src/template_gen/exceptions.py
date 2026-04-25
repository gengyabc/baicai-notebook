class TemplateGenError(Exception):
    pass


class ParseError(TemplateGenError):
    def __init__(self, file_path: str, reason: str):
        self.file_path = file_path
        self.reason = reason
        super().__init__(f"Parse error for {file_path}: {reason}")


class FillError(TemplateGenError):
    def __init__(self, message: str, missing_fields: list[str] = None):
        self.missing_fields = missing_fields or []
        super().__init__(message)