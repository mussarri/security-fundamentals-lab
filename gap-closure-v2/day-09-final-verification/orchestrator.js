const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const testSuites = [
  {
    day: "Day 1",
    name: "Browser Security Lab v2",
    script: "gap-closure-v2/day-01-browser-lab-v2/test-suite.sh",
  },
  {
    day: "Day 2-3",
    name: "Authentication Lifecycle Lab",
    script: "gap-closure-v2/day-02-03-auth-lifecycle/test-suite.sh",
  },
  {
    day: "Day 4",
    name: "Command Injection Lab",
    script: "gap-closure-v2/day-04-command-injection/test-suite.sh",
  },
  {
    day: "Day 5",
    name: "Filesystem Security Lab",
    script: "gap-closure-v2/day-05-filesystem-security/test-suite.sh",
  },
  {
    day: "Day 6",
    name: "File Upload Security Lab",
    script: "gap-closure-v2/day-06-file-upload/test-suite.sh",
  },
  {
    day: "Day 7",
    name: "SSRF v3 Defense Pipeline",
    script: "gap-closure-v2/day-07-ssrf-v3/test-suite.sh",
  },
  {
    day: "Day 8",
    name: "HTTP Desync Lab v2",
    script: "gap-closure-v2/day-08-http-desync-v2/test-suite.sh",
  },
];

console.log(
  "================================================================================",
);
console.log(
  "       CENTRAL SECURITY REGRESSION & VERIFICATION TEST SUITE RUNNER            ",
);
console.log(
  "================================================================================\n",
);

const results = [];
let allPassed = true;

for (const suite of testSuites) {
  const fullPath = path.resolve(process.cwd(), suite.script);
  process.stdout.write(
    `[*] [KOŞULUYOR] ${suite.day.padEnd(8)} - ${suite.name}... `,
  );

  if (!fs.existsSync(fullPath)) {
    console.log("BULUNAMADI!");
    results.push({ ...suite, status: "MISSING", durationMs: 0 });
    allPassed = false;
    continue;
  }

  const startTime = Date.now();
  const execResult = spawnSync("bash", [fullPath], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const durationMs = Date.now() - startTime;

  if (execResult.status === 0) {
    console.log(`BAŞARILI (${(durationMs / 1000).toFixed(2)}s)`);
    results.push({ ...suite, status: "PASSED", durationMs });
  } else {
    console.log(`BAŞARISIZ! (Exit Code: ${execResult.status})`);
    results.push({
      ...suite,
      status: "FAILED",
      durationMs,
      error: execResult.stderr || execResult.stdout,
    });
    allPassed = false;
  }
}

console.log(
  "\n================================================================================",
);
console.log(
  "                           SONUÇ ÖZET RAPORU                                    ",
);
console.log(
  "================================================================================",
);

results.forEach((r) => {
  const statusStr = r.status === "PASSED" ? "[PASS]" : "[FAIL]";
  console.log(
    `${statusStr.padEnd(8)} | ${r.day.padEnd(9)} | ${r.name.padEnd(35)} | ${(r.durationMs / 1000).toFixed(2)}s`,
  );
});

console.log(
  "--------------------------------------------------------------------------------",
);

if (!allPassed) {
  console.error(
    "\n[!] Güvenlik regresyon testi başarısız oldu. Bazı denetimler beklenen sonucu vermedi.",
  );
  process.exit(1);
} else {
  console.log(
    "\n[+] Bütün güvenlik gereksinimleri ve regresyon testleri eksiksiz doğrulandı.",
  );
  process.exit(0);
}
