export default function Graph() {
  const handleBack = () => {
    // if opened as popup this will close window, otherwise navigate back
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Graph</h1>
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </button>
      </div>
      <p className="text-slate-600 mb-4">Visualize your data with graphs and charts.</p>
      <p className="text-slate-600">Fields of the table would be shown here:</p>
      <ul className="list-disc ml-6 text-slate-700">
        <li>FieldA</li>
        <li>FieldB</li>
        <li>FieldC</li>
      </ul>
      <p className="text-slate-600 mt-4">
        Suggestions for graph type based on data types would appear below.
      </p>
    </div>
  );
}
