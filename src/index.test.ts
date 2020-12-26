import { uploadSync, wsclient } from ".";
import { expect } from "../chai.min.js";
const describe = (str, fn) => {
  console.log(str);
  fn();
};
const it = (str, fn) => {
  console.log(str);
  fn();
};
describe("wsclient", () => {
  it("instantiaes BlobServiceclient from process env", () => {
    expect(wsclient()).to.exist;
    uploadSync("tsconfig.json", "wav").then((res) => {
      expect(res).to.exist;
      const url = res && res!.url;
      expect(
        JSON.parse(
          require("child_process").execSync(`curl -s ${url} -o -`).toString()
        ).compilerOptions.target
      ).to.equal("ES2018");
    });
  });
});
