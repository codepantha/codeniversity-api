import { app } from "./app";

const PORT = process.env.PORT || 8000;
app.listen(process.env.PORT, () => console.log(`app started on port ${PORT}`))