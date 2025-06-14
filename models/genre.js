const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GenreSchema = new Schema({
    name: {type: String, required: true, minLength: 3, maxLength: 100},
    //category: {type: String, required: true, enum: ["Fiction", "Non-Fiction", "Fantasy", "Science Fiction", "Mystery", "Horror", "Romance", "Biography", "Self-Help", "Cooking", "Travel", "History", "Science", "Art", "Children", "Young Adult", "Other"]},
});

GenreSchema.virtual("url").get(function () {
    return `/catalog/genre/${this._id}`;
});

module.exports = mongoose.model("Genre", GenreSchema); 