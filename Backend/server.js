require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
