import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

/**
 * Fork regression test for the on-chain generator's handling of "custom@na" projects.
 *
 * Projects declaring "custom@na" store a complete HTML document as their project
 * script. The pre-upgrade generator wrapped that document in a <script> tag, which
 * both broke HTML parsing (the document's own "</script>" closed the wrapper early)
 * and prevented the markup from rendering at all.
 *
 * This suite upgrades the real mainnet proxy on a fork and asserts that:
 *  - every "custom@na" project is now injected verbatim, and
 *  - every other project's HTML is byte-identical to what it was before the upgrade.
 */
const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
// @dev must be after Quine's Oct 2025 launch, and after every core contract under
// test was registered with the DependencyRegistry
const FORK_BLOCK_NUMBER = 25691272;

const GENERATOR_PROXY = "0x953D288708bB771F969FCfD9BA0819eF506Ac718";
const PROXY_ADMIN = "0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232";
const PROXY_ADMIN_OWNER = "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA";

// Every "custom@na" project on mainnet. Each stores a full HTML document.
const CUSTOM_NA_PROJECTS = [
  {
    name: "Quine",
    core: "0xab00000000002ade39f58f9d8278a31574ffbe77",
    projectId: 506,
    tokenId: 506000239,
  },
  {
    name: "send/receive",
    core: "0xababababab20053426ad1c782de9ea8444358070",
    projectId: 5,
    tokenId: 5000000,
  },
  {
    name: "SpiroFlakes",
    core: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    projectId: 136,
    tokenId: 136000000,
  },
  {
    name: "Paramecircle",
    core: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    projectId: 195,
    tokenId: 195000000,
  },
  {
    name: "Overture",
    core: "0x000000dab303a194b3f55d4702b24740ad5a2f00",
    projectId: 0,
    tokenId: 0,
  },
];

// Projects that must be completely unaffected. PRELUDES and Crypt are the important
// ones: they are JavaScript that deliberately emits "</script>" to close the wrapper
// and append its own markup, so they depend on the wrapped path staying byte-identical.
const UNAFFECTED_PROJECTS = [
  {
    name: "PRELUDES",
    core: "0xea698596b6009a622c3ed00dd5a8b5d1cae4fc36",
    projectId: 5,
    tokenId: 5000000,
  },
  {
    name: "Crypt",
    core: "0x99a9b7c1116f9ceeb1652de04d5969cce509b069",
    projectId: 453,
    tokenId: 453000000,
  },
  {
    name: "Gas Wars",
    core: "0xab00000000002ade39f58f9d8278a31574ffbe77",
    projectId: 505,
    tokenId: 505000001,
  },
];

const STYLE_TAG =
  "<style>html{height:100%}body{min-height:100%;margin:0;padding:0}canvas{padding:0;margin:auto;display:block;position:absolute;top:0;bottom:0;left:0;right:0}</style>";

// @dev send/receive assembles ~700KB of HTML, which exceeds hardhat's default
// eth_call gas cap; these are view calls, so the limit is free to raise
const CALL_OVERRIDES = { gasLimit: 500_000_000 };

// @dev skipped under coverage: instrumented bytecode plus send/receive's ~700KB of
// assembled HTML exhausts the coverage runner's memory (CircleCI exit code 129).
describe("GenArt721GeneratorV0 custom@na fork regression [ @skip-on-coverage ]", function () {
  // forking + a full upgrade is slow relative to the default mocha timeout
  this.timeout(600_000);

  let generator: any;
  const htmlBefore: Record<string, string> = {};
  const scripts: Record<string, string> = {};

  before(async function () {
    await helpers.reset(FORK_URL, FORK_BLOCK_NUMBER);
    generator = await ethers.getContractAt(
      "GenArt721GeneratorV0",
      GENERATOR_PROXY
    );

    // capture pre-upgrade output for every project under test
    for (const p of [...CUSTOM_NA_PROJECTS, ...UNAFFECTED_PROJECTS]) {
      htmlBefore[p.name] = await generator.getTokenHtml(
        p.core,
        p.tokenId,
        CALL_OVERRIDES
      );
      scripts[p.name] = await generator.getProjectScript(
        p.core,
        p.projectId,
        CALL_OVERRIDES
      );
    }

    // upgrade the real proxy to the new implementation
    const factory = await ethers.getContractFactory("GenArt721GeneratorV0");
    const newImplementation = await upgrades.prepareUpgrade(
      GENERATOR_PROXY,
      factory
    );
    const proxyAdmin = await ethers.getContractAt(
      ["function upgrade(address proxy, address implementation) external"],
      PROXY_ADMIN
    );
    await helpers.setBalance(PROXY_ADMIN_OWNER, ethers.utils.parseEther("10"));
    const owner = await ethers.getImpersonatedSigner(PROXY_ADMIN_OWNER);
    await proxyAdmin
      .connect(owner)
      .upgrade(GENERATOR_PROXY, newImplementation as string);
  });

  after(async function () {
    await helpers.reset();
  });

  describe("custom@na projects", function () {
    for (const p of CUSTOM_NA_PROJECTS) {
      describe(p.name, function () {
        it("was broken before the upgrade (script wrapped in a script tag)", async function () {
          expect(htmlBefore[p.name]).to.include(
            `<script>${scripts[p.name]}</script>`
          );
        });

        it("contains a literal </script> that would break the wrapper", async function () {
          expect(scripts[p.name]).to.include("</script>");
        });

        it("stores markup rather than JavaScript", async function () {
          expect(scripts[p.name].trimStart().startsWith("<")).to.equal(true);
        });

        it("is injected verbatim after the upgrade", async function () {
          const html = await generator.getTokenHtml(
            p.core,
            p.tokenId,
            CALL_OVERRIDES
          );
          expect(html).to.include(scripts[p.name]);
          expect(html).to.not.include(`<script>${scripts[p.name]}</script>`);
          // the document is the last thing in the body
          expect(html).to.include(`${scripts[p.name]}</body></html>`);
        });

        it("no longer emits the generator's default style reset", async function () {
          const html = await generator.getTokenHtml(
            p.core,
            p.tokenId,
            CALL_OVERRIDES
          );
          expect(html).to.not.include(STYLE_TAG);
        });

        it("still injects tokenData before the document", async function () {
          const html = await generator.getTokenHtml(
            p.core,
            p.tokenId,
            CALL_OVERRIDES
          );
          expect(html).to.include("let tokenData = JSON.parse(`");
          expect(html.indexOf("let tokenData")).to.be.lessThan(
            html.indexOf(scripts[p.name])
          );
        });

        it("keeps the base64 data URI consistent with the raw HTML", async function () {
          const html = await generator.getTokenHtml(
            p.core,
            p.tokenId,
            CALL_OVERRIDES
          );
          const encoded = await generator.getTokenHtmlBase64EncodedDataUri(
            p.core,
            p.tokenId,
            CALL_OVERRIDES
          );
          expect(encoded).to.equal(
            `data:text/html;base64,${Buffer.from(html).toString("base64")}`
          );
        });
      });
    }
  });

  describe("unaffected projects", function () {
    for (const p of UNAFFECTED_PROJECTS) {
      it(`${p.name} output is byte-identical after the upgrade`, async function () {
        const html = await generator.getTokenHtml(
          p.core,
          p.tokenId,
          CALL_OVERRIDES
        );
        expect(html).to.equal(htmlBefore[p.name]);
      });
    }

    it("PRELUDES still closes the wrapper itself (breakout preserved)", async function () {
      const html = await generator.getTokenHtml(
        UNAFFECTED_PROJECTS[0].core,
        UNAFFECTED_PROJECTS[0].tokenId,
        CALL_OVERRIDES
      );
      expect(html).to.include(`<script>${scripts["PRELUDES"]}</script>`);
      expect(scripts["PRELUDES"]).to.include("</script>");
    });
  });
});
