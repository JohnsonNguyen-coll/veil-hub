import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = process.cwd();
const sources = {};

for (const file of fs.readdirSync(path.join(root, "contracts"))) {
  if (file.endsWith(".sol")) {
    const fullPath = path.join(root, "contracts", file);
    sources[`contracts/${file}`] = { content: fs.readFileSync(fullPath, "utf8") };
  }
}

function findImport(importPath) {
  const candidates = [
    path.join(root, importPath),
    path.join(root, "node_modules", importPath)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }

  return { error: `Import not found: ${importPath}` };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
const errors = output.errors || [];

for (const error of errors) {
  const stream = error.severity === "error" ? process.stderr : process.stdout;
  stream.write(`${error.formattedMessage}\n`);
}

if (errors.some((error) => error.severity === "error")) {
  process.exit(1);
}

fs.mkdirSync(path.join(root, "artifacts-solc"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts-solc", "compile-output.json"), JSON.stringify(output, null, 2));

console.log(`Compiled ${Object.keys(output.contracts || {}).length} source groups with solc ${solc.version()}`);

