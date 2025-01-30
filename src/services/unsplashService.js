const schedule = require("node-schedule");
const fetch = require("node-fetch");
const { unsplashAccessKey } = require("../constant.ts");
const { UnsplashImage } = require("../models/unsplashImage");

const fetchRandomImage = async () => {
  try {
    const params = {
      query: "nature landscape", // 关键词
      orientation: "landscape", // 横屏
      client_id: unsplashAccessKey,
    };
    const queryString = new URLSearchParams(params).toString();

    const response = await fetch(
      `https://api.unsplash.com/photos/random?${queryString}`,
      {
        headers: {
          Authorization: `Client-ID ${unsplashAccessKey}`,
        },
      }
    );

    const data = await response.json();

    await UnsplashImage.create({
      imageUrl: data.urls.full,
      author: data.user,
      downloadLocation: data.links.download_location,
      location: data.location,
      urls: data.urls,
    });

    // 通知 Unsplash 下载事件
    await fetch(data.links.download_location, {
      headers: {
        Authorization: `Client-ID ${unsplashAccessKey}`,
      },
    });

    console.log("New image fetched and saved successfully");
  } catch (error) {
    console.error("Error fetching image:", error);
  }
};

const initUnsplashSchedule = () => {
  // 每12小时执行一次
  schedule.scheduleJob("0 */12 * * *", fetchRandomImage);

  // 启动时立即执行一次
  fetchRandomImage();
};

module.exports = {
  initUnsplashSchedule,
  fetchRandomImage,
};
