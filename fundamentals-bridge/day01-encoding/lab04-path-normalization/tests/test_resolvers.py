import tempfile
import pytest
from pathlib import Path
from vulnerable.resolver import NaivePathResolver
from fixed.resolver import SecurePathResolver

@pytest.fixture
def storage_environment():
    with tempfile.TemporaryDirectory() as temp_dir:
        base = Path(temp_dir) / "app_storage"
        base.mkdir()

        # Depolama içi meşru dosya
        legit_file = base / "profile.json"
        legit_file.write_text('{"status": "ok"}')

        # Depolama dışı korumalı dosya
        outside_file = Path(temp_dir) / "system.conf"
        outside_file.write_text("CONFIDENTIAL")

        yield str(base), str(outside_file)

def test_vulnerable_resolver_boundary_leaks(storage_environment):
    base_dir, _ = storage_environment
    resolver = NaivePathResolver(base_dir)

    # Windows stili ayrac içeren girdi '../' dize kontrolünü atlatır
    windows_style = r"..\system.conf"
    res_win = resolver.resolve(windows_style)
    assert res_win is not None
    assert ".." in res_win

    # Mutlak yol verildiğinde os.path.join base_dir'i tamamen terk eder
    absolute_input = "/var/log/system.log"
    res_abs = resolver.resolve(absolute_input)
    assert res_abs == absolute_input

def test_secure_resolver_strictly_enforces_boundary(storage_environment):
    base_dir, _ = storage_environment
    secure_resolver = SecurePathResolver(base_dir)

    # Dizin dışına çıkış girişimleri reddedilmelidir (None dönmelidir)
    traversal_variants = [
        "../system.conf",
        r"..\system.conf",
        "/var/log/system.log",
        "nested/../../system.conf",
        "valid_sub/../../../outside.txt",
    ]

    for variant in traversal_variants:
        assert secure_resolver.resolve(variant) is None, f"Engellenemedi: {variant}"

def test_secure_resolver_allows_legitimate_paths(storage_environment):
    base_dir, _ = storage_environment
    secure_resolver = SecurePathResolver(base_dir)

    # Normal dosya erişimi
    legit = secure_resolver.resolve("profile.json")
    assert legit is not None
    assert legit.name == "profile.json"

    # Güvenli alt dizin erişimi
    sub_legit = secure_resolver.resolve("sub/../profile.json")
    assert sub_legit is not None
    assert sub_legit.name == "profile.json"
