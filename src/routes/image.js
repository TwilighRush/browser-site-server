const Router = require("@koa/router");
const { UnsplashImage } = require("../models/unsplashImage");

const router = new Router({
  prefix: "/images",
});

router.get("/latest", async (ctx) => {
  try {
    const latestImage = await UnsplashImage.findOne({
      order: [["createdAt", "DESC"]],
    });

    if (!latestImage) {
      ctx.status = 404;
      ctx.body = {
        failed: true,
        message: "No images found",
      };
      return;
    }

    ctx.body = {
      success: true,
      data: latestImage,
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      failed: true,
      message: "Internal server error",
    };
  }
});

module.exports = router;
