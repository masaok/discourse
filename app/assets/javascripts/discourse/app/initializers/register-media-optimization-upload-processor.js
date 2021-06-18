import { addComposerUploadProcessor } from "discourse/components/composer-editor";

export default {
  name: "register-media-optimization-upload-processor",

  initialize(container) {
    addComposerUploadProcessor(
      { action: "optimizeJPEG" },
      {
        optimizeJPEG: (data) =>
          container
            .lookup("service:media-optimization-worker")
            .optimizeImage(data),
      }
    );
  },
};
