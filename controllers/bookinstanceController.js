const BookInstance = require("../models/bookinstance");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const Book = require("../models/book");
const bookinstance = require("../models/bookinstance");


// Display list of all BookInstances.
exports.bookinstance_list = asyncHandler(async (req, res, next) => {
  // Display list of all BookInstances.
  const allBookInstances = await BookInstance.find().populate("book").exec();

  res.render("bookinstance_list", 
    {
      title: "Book Instance List", //Dieser Titel kommt letztendlich aus dem book models Ordner
      bookinstance_list: allBookInstances,
    });
});

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).populate("book").exec();

  if (bookInstance === null){
    const err = new Error("Book copy not found");
    err.status = 404;
    return next (err);
  }

  res.render("bookinstance_detail", {
    title: "Book",
    bookInstance: bookInstance,
  });
});

// Display BookInstance create form on GET.
exports.bookinstance_create_get = asyncHandler(async (req, res, next) => {
  const allBooks = await Book.find({}, "title").sort({ title: 1 }).exec();
  const status_list = await BookInstance.schema.path("status").enumValues;

  res.render("bookinstance_form", {
    title: "Create BookInstance",
    book_list: allBooks,
    status_list: status_list,
  });
});

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1}).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1})
    .escape(),
  body("status").escape(),
  body("due_back", "invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookInstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()){
      // There are errors.
      // Render form again with sanitized values and error messages.
      const allBooks = await Book.find({}, "title").sort({ title: 1}).exec();
      const status_list = await BookInstance.schema.path("status").enumValues;
      
      // BookInstance.schema
      // → Greift auf das Mongoose-Schema des Modells BookInstance zu.
      // .path("status")
      // → Holt das Schema-Feld status (also die Definition dieses Feldes).
      // .enumValues
      // → Gibt das Array der zulässigen Enum-Werte für dieses Feld zurück.

      // Würde aber auch nicht einfach BookInstance.status.enumValues funktionieren?

      // Aber nein, BookInstance.status.enumValues funktioniert nicht. Hier ist warum:

      // 📦 Was ist BookInstance eigentlich?
      // const BookInstance = mongoose.model("BookInstance", BookInstanceSchema);
      // Das ist ein Mongoose-Modell, also eine Klasse/Funktion, mit der du neue Dokumente erstellst (z. B. new BookInstance(...)) oder Datenbankabfragen machst (BookInstance.find(...)).

      // Modelle haben keinen direkten Zugriff auf Felddefinitionen wie enumValues.
      // ✅ Was funktioniert dagegen?
      // BookInstance.schema.path("status").enumValues
      // Das ist der korrekte Weg, um die Felddefinition für status im Schema abzufragen. Genauer gesagt:

      // BookInstance.schema → holt das Schema
      // .path("status") → holt die Definition des status-Feldes
      // .enumValues → holt das enum-Array
      // 🛑 Warum funktioniert BookInstance.status.enumValues nicht?
      // Weil BookInstance.status nicht existiert – du greifst hier auf ein Model-Feld zu, das es gar nicht gibt.

      // Nur Instanzen eines Modells (also ein konkretes Objekt wie const inst = new BookInstance({...})) haben ein status-Feld mit Daten, aber kein Schema oder enum.


      res.render("bookinstance_form", {
        title: "Create BookInstance",
        book_list: allBooks,
        selected_book: bookInstance.book._id,
        errors: errors.array(),
        bookinstance: bookInstance,
        status_list: status_list,
      });
      return;
    } else {
      // Data from form is valid.
      await bookInstance.save();
      res.redirect(bookInstance.url);
    }
  }),
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).populate("book").exec();

  if (bookInstance === null ) {
    // No results
    res.redirect("/catalog/bookinstances");
  }

  res.render("bookinstance_delete", {
    title: "Delete BookInstance",
    bookInstance
  });

});

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).populate("book").exec();

  if (bookInstance === null) {
    // No results
    res.redirect("/catalog/bookinstances");
  }

  await BookInstance.findByIdAndDelete(req.body.bookinstanceid);
  res.redirect("/catalog/bookinstances");
});

// Display BookInstance update form on GET.
exports.bookinstance_update_get = asyncHandler(async (req, res, next) => {
  const [bookInstance, allBooks]= await Promise.all([
    BookInstance.findById(req.params.id).populate("book").exec(),
    Book.find({}, "title").sort({ title: 1}).exec()
  ]);
  // const status_list = await BookInstance.schema.path("status").enumValues;

  if (bookInstance === null) {
    // No results
    const err = new Error("BookInstance not found");
    err.status = 404;
    return next(err);
  }

  res.render("bookinstance_form", {
    title: "Update BookInstance",
    bookinstance: bookInstance,
    book_list: allBooks,
    selected_book: bookInstance.book._id,
    errors: errors.array(),
    // status_list,
  });
});

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
// Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1}).escape(),
  body("imprint", "Imprint must be specified").trim().isLength({ min: 1 }).escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

asyncHandler(async (req, res, next) => {
  // Extract the validation errors from a request.
  const errors = validationResult(req);

  // Create a BookInstance object with escaped and trimmed data.
  const bookInstance = new BookInstance({
    book: req.body.book,
    imprint: req.body.imprint,
    status: req.body.status,
    due_back: req.body.due_back,
    _id: req.params.id, // This is required to update an existing record
  });

  if (!errors.isEmpty()) {
    // There are errors.
    // Render form again with sanitized values and error messages.
    const allBooks = await Book.find({}, "title").sort({ title: 1 }).exec();
    // const status_list = await BookInstance.schema.path("status").enumValues;

    res.render("bookinstance_form", {
      title: "Update BookInstance",
      bookinstance: bookInstance,
      book_list: allBooks,
      selected_book: bookInstance.book._id,
      errors: errors.array(),
      // status_list,
    });
    return;
  } else {
    // Data from form is valid. 
    await BookInstance.findByIdAndUpdate(req.params.id, bookInstance, {});
    res.redirect(bookInstance.url);
  }
}),
]