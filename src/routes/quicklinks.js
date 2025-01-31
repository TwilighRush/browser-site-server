const Router = require("@koa/router");
const auth = require("../middleware/auth");
const User = require("../models/user");

const router = new Router({ prefix: "/api/quicklinks" });

// 获取用户的快捷链接
router.get("/", auth, async (ctx) => {
  try {
    console.log(ctx.state);

    const user = await User.findOne({ where: { id: ctx.state.user.userId } });
    console.log(user);
    console.log("===========================");
    console.log(ctx.state.user.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        failed: true,
        message: "用户不存在",
      };
      return;
    }
    ctx.body = user.quickLinks || [];
  } catch (error) {
    console.log(error);
    ctx.status = 500;
    ctx.body = {
      failed: true,
      message: "服务器错误",
    };
  }
});

// 更新用户的快捷链接
router.post("/", auth, async (ctx) => {
  try {
    const user = await User.findByPk(ctx.state.user.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        failed: true,
        message: "用户不存在",
      };
      return;
    }
    user.quickLinks = ctx.request.body.links;
    await user.save();
    ctx.body = user.quickLinks;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      failed: true,
      message: "服务器错误",
    };
  }
});

module.exports = router;
