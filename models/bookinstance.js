const mongoose = require("mongoose");
const { DateTime } = require("luxon");


const Schema = mongoose.Schema;

const BookInstanceSchema = new Schema ({
    book: {type: Schema.Types.ObjectId, ref:"Book", required: true},
    // reference to the associated book
    imprint: {type: String, required: true},
    status: {
        type: String,
        required: true,
        enum: ["Available", "Maintenance", "Loaned", "Reserved"],
        default: "Maintenance",
    },
    due_back: { type: Date, default: Date.now},
});

// Virtual for bookinstance's URL
BookInstanceSchema.virtual("url").get(function (){
    // We don't use an arrow function as we'll need the this object
    return `/catalog/bookinstance/${this._id}`;
});


// Luxon can import strings in many formats and export to both predefined and free-form formats. In this case we use fromJSDate() to import a JavaScript date string and toLocaleString() to output the date in DATE_MED format in English: Apr 10th, 2023. For information about other formats and date string internationalization see the Luxon documentation on formatting

BookInstanceSchema.virtual("due_back_formatted").get(function () {
    return DateTime.fromJSDate(this.due_back).toLocaleString(DateTime.DATE_MED);
});

BookInstanceSchema.virtual("due_back_yyyy_mm_dd").get(function () {
    return DateTime.fromJSDate(this.due_back).toISODate(); // format 'YYYY-MM-DD'
});

// Export model
module.exports = mongoose.model("BookInstance", BookInstanceSchema);