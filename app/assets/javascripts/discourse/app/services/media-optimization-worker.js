/* eslint-disable no-console */
import Service from "@ember/service";
import { Promise } from "rsvp";
import { fileToImageData } from "discourse/lib/media-optimization-utils";

export default class MediaOptimizationWorkerService extends Service {
  worker = null;
  worker_url = "/javascripts/media-optimization-worker.js";
  currentComposerUploadData = null;
  currentPromiseResolver = null;

  startWorker() {
    this.worker = new Worker(this.worker_url, { type: "module" }); // TODO come up with a workaround for FF that lacks type: module support
  }

  stopWorker() {
    this.worker.terminate();
    this.worker = null;
  }

  ensureAvailiableWorker() {
    if (this.worker === null) {
      this.startWorker();
      this.registerMessageHandler();
    }
  }

  optimizeImage(data) {
    this.ensureAvailiableWorker();

    let file = data.files[data.index];
    if (!/(\.|\/)(jpe?g)$/i.test(file.type)) {
      return data;
    }
    let p = new Promise(async (resolve) => {
      console.log(`Transforming ${file.name}`);

      this.currentComposerUploadData = data;
      this.currentPromiseResolver = resolve;

      const { imageData, width, height } = await fileToImageData(file);

      this.worker.postMessage(
        {
          type: "compress",
          file: imageData.data.buffer,
          fileName: file.name,
          width: width,
          height: height,
          settings: {
            /*wasm_mozjpeg_wasm: fixScriptURL(
              settings.theme_uploads.wasm_mozjpeg_wasm
            ),
            wasm_image_loader_wasm: fixScriptURL(
              settings.theme_uploads.wasm_image_loader_wasm
            ),
            resize_width_threshold: settings.resize_width_threshold,
            resize_height_threshold:
              settings.resize_height_threshold,
            enable_resize: settings.enable_resize,
            enable_reencode: settings.enable_reencode,
            */
          },
        },
        [imageData.data.buffer]
      );
    });
    return p;
  }

  registerMessageHandler() {
    this.worker.onmessage = (e) => {
      console.log("Main: Message received from worker script");
      console.log(e);
      switch (e.data.type) {
        case "file":
          let optimizedFile = new File([e.data.file], `${e.data.fileName}`, {
            type: "image/jpeg",
          });
          console.log(
            `Finished optimization of ${optimizedFile.name} new size: ${optimizedFile.size}.`
          );
          let data = this.currentComposerUploadData;
          data.files[data.index] = optimizedFile;
          this.currentPromiseResolver(data);
          break;
        case "error":
          this.currentPromiseResolver(data);
          break;
        default:
          console.log(`Sorry, we are out of ${e}.`);
      }
    };
  }
}
