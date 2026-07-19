import api from "../api/axios";

function sourceIcon(contentType) {
  if (!contentType) return "📄";
  if (contentType === "application/pdf") return "📄";
  if (contentType === "text/html") return "🌐";
  if (contentType === "text/plain") return "🐙"; // GitHub file imports
  if (contentType.startsWith("image/")) return "🖼️";
  return "📄";
}

export default function Sidebar({
  documents,
  selectedDocument,
  setSelectedDocument,
  fetchDocuments,
  isOpen,
  onClose,
}) {

  const handleDelete = async (id) => {

    const confirmDelete = window.confirm(
      "Delete this document?"
    );

    if (!confirmDelete) return;

    try {

      await api.delete(`/documents/${id}`);

      if (
        selectedDocument &&
        selectedDocument.id === id
      ) {
        setSelectedDocument(null);
      }

      fetchDocuments();

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.detail ||
        "Delete failed."
      );

    }

  };

  return (
    <>
      {/* Mobile-only backdrop, closes the drawer on tap outside it */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-800 p-6 border-r border-slate-700
          transform transition-transform duration-200 ease-in-out
          lg:static lg:z-auto lg:w-80 lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Documents
          </h2>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white text-xl"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-3 overflow-y-auto max-h-[80vh]">

          {documents.length === 0 ? (

            <p className="text-slate-400">
              No documents uploaded.
            </p>

          ) : (

            documents.map((doc) => (

              <div
                key={doc.id}
                className={`rounded-lg p-3 transition ${
                  selectedDocument?.id === doc.id
                    ? "bg-blue-700"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >

                <div
                  className="cursor-pointer break-words"
                  onClick={() => {
                    setSelectedDocument(doc);
                    onClose && onClose();
                  }}
                >
                  {sourceIcon(doc.content_type)} {doc.filename}
                </div>

                <button
                  onClick={() => handleDelete(doc.id)}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                >
                  Delete
                </button>

              </div>

            ))

          )}

        </div>

      </div>
    </>
  );

}