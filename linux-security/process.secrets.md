Sensitive credentials must NEVER be passed via command-line flags. While /proc/<PID>/environ is protected by kernel DAC (0400), /proc/<PID>/cmdline is world-readable (0444) by design.
