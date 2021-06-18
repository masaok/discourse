import mozDec from '/javascripts/squoosh/mozjpeg_enc.js';

async function optimize(imageData, fileName, width, height, settings) {
  let encoderModuleOverrides = {
    locateFile: function (path) {
      return settings.wasm_mozjpeg_wasm;
    },
    onRuntimeInitialized: function () {
      return this;
    },
  };

  let encoder = await mozDec();

  const mozJpegDefaultOptions = {
    quality: 75,
    baseline: false,
    arithmetic: false,
    progressive: true,
    optimize_coding: true,
    smoothing: 0,
    color_space: 3 /*YCbCr*/,
    quant_table: 3,
    trellis_multipass: false,
    trellis_opt_zero: false,
    trellis_opt_table: false,
    trellis_loops: 1,
    auto_subsample: true,
    chroma_subsample: 2,
    separate_chroma_quality: false,
    chroma_quality: 75,
  };

  console.log(`Worker received imageData: ${imageData.byteLength}`);

  console.log(imageData);

  const result = encoder.encode(
    imageData,
    width,
    height,
    mozJpegDefaultOptions
  );

  console.log(`Worker post reencode file: ${result.byteLength}`);

  let transferrable = Uint8Array.from(result).buffer; // decoded was allocated inside WASM so it can be transfered to another context, need to copy by value

  return transferrable;
}

onmessage = async function (e) {
  console.log("Worker: Message received from main script");
  console.log(e);

  switch (e.data.type) {
    case "compress":
      try {
        let optimized = await optimize(
          e.data.file,
          e.data.fileName,
          e.data.width,
          e.data.height,
          e.data.settings
        );
        postMessage(
          {
            type: "file",
            file: optimized,
            fileName: e.data.fileName
          },
          [optimized]
        );
      } catch (error) {
        console.error(error);
        postMessage({
          type: "error",
        });
      }
      break;
    default:
      console.log(`Sorry, we are out of ${e}.`);
  }
};
