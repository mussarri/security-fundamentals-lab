# Linux Security Fundamentals

This module covers core Linux kernel isolation mechanisms, file system access control (DAC), process boundaries, and capability segregation from a Product Security & Security Research perspective.

## 1. Core Security Invariants

- **Process Argument Exposure (`/proc/<PID>/cmdline` vs `/proc/<PID>/environ`):**
  - `/proc/<PID>/environ` is strictly protected by kernel Discretionary Access Control (`0400`). Only the owning UID, `root`, or processes with `CAP_SYS_PTRACE` can inspect it.
  - `/proc/<PID>/cmdline` is world-readable (`0444`) by design. Passing secrets (API tokens, database credentials) via command-line arguments leaks credentials to any local unprivileged actor running `ps` or inspecting `/proc`.

- **Directory Traversal vs Read Permissions (`x` vs `r`):**
  - `r` on a directory allows reading the directory index (file names via `ls`).
  - `x` (execute) on a directory allows inode resolution and traversal (`cd`, direct access).
  - A file set to `chmod 777` remains inaccessible to other users if any parent directory lacks the `x` permission for that user.

- **Atomic Privilege Segregation (Capabilities vs SUID):**
  - Traditional SUID binaries (`chmod u+s`) violate the Principle of Least Privilege by elevating the executing process to full `root` (EUID 0).
  - Linux Capabilities decompose `root` privileges into atomic units (e.g., granting `CAP_NET_RAW` to allow raw socket sniffing without granting arbitrary file access).

- **Directory Deletion & The Sticky Bit (`+t`):**
  - In Unix file systems, file deletion is a write operation on the **parent directory**, not the file itself.
  - In world-writable directories (`777`), the sticky bit (`1777`) prevents unprivileged users from deleting or renaming files owned by others.

## 2. Included Tools & PoCs

- `scripts/poc-proc-leak.sh`: Automated PoC proving credential leakage via `cmdline` while validating `environ` DAC isolation.
- `scripts/mini-audit.sh`: Lightweight reconnaissance script auditing open sockets (`0.0.0.0` vs `127.0.0.1`), dangerous SUID binaries, and assigned capabilities.
