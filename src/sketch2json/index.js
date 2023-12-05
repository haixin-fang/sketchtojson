/* eslint-disable */
import JSZip from "jszip";
const signatureList = [
  {
    mime: "image/jpeg",
    ext: "jpeg",
    signature: [0xff, 0xd8, 0xff],
  },
  {
    mime: "image/png",
    ext: "png",
    signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    mime: "image/gif",
    ext: "gif",
    signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  },
  {
    mime: "image/gif",
    ext: "gif",
    signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  },
];
const check = (bufferss, { signature, offset = 0 }) => {
  for (let i = 0, len = signature.length; i < len; i++) {
    // 传入字节数据与文件signature不匹配
    // 需考虑有offset的情况以及signature中有值为undefined的情况
    if (bufferss[i + offset] !== signature[i] && signature[i] !== undefined) return false;
  }
  return true;
};

function getSketchContents(zippedFolder) {
  return new Promise((resolve, reject) => {
    JSZip.loadAsync(zippedFolder)
      .then(function (zip) {
        resolve(zip);
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

async function getFileFromZip(zip, path) {
  if (path.indexOf("json") != -1) {
    return new Promise((resolve, reject) =>
      zip
        .file(path)
        .async("string")
        .then(function (content) {
          resolve([path, JSON.parse(content)]);
        })
        .catch(function (error) {
          reject(error);
        })
    );
  } else {
    return new Promise((resolve, reject) =>
      zip
        .file(path)
        .async("arraybuffer")
        .then(function (res) {
          try {
            var binary = "";
            var bytes = new Uint8Array(res);
            let ext = "";
            // 找出签名列表中定义好的类型，并返回
            for (let i = 0, len = signatureList.length; i < len; i++) {
              if (check(bytes, signatureList[i])) {
                ext = signatureList[i];
              }
            }
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = "data:" + ext.mime + ";base64," + window.btoa(binary);
            resolve([path, base64]);
          } catch (e) {
            reject(e);
          }
        })
        .catch(function (error) {
          reject(error);
        })
    );
  }
}

function init(zippedFolder) {
  return getSketchContents(zippedFolder)
    .then((zip) => {
      const result = [];
      Object.keys(zip.files).forEach((path) => {
        result.push(getFileFromZip(zip, path));
      });
      return Promise.all(result);
    })
    .then((parsedPairsList) => {
      console.log("parsedPairsList", parsedPairsList);
      return parsedPairsList.reduce(
        (result, pair) => {
          if (pair[0] === "document.json") {
            result.document = pair[1];
          } else if (pair[0] === "user.json") {
            result.user = pair[1];
          } else if (pair[0] === "meta.json") {
            result.meta = pair[1];
          } else if (pair[0].indexOf("images") != -1) {
            // 图片解析
            if (!result.image) {
              result.image = {};
            }
            result.image[pair[0]] = pair[1];
          } else if (typeof pair[1] == "object" && pair[1]._class == "page") {
            result.pages[pair[0].split("/")[1].slice(0, -5)] = pair[1];
          }
          return result;
        },
        { pages: {} }
      );
    });
}

export default init;
