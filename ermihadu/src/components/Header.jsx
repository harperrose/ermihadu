export default function Header({ showForm, setShowForm }) {
  return (
    <header className="title">
      <h1>
        <span 
          onClick={() => setShowForm(true)}
          style={{ 
            cursor: 'pointer',
            textDecoration: !showForm ? 'none' : 'underline'

         }}
        >
          ERMIHADU
        </span>{' '}
        <span 
          onClick={() => setShowForm(false)}
          style={{ 
            cursor: 'pointer',
            textDecoration: !showForm ? 'underline' : 'none'
          }}
        >
          ITEMS
        </span>
      </h1>
    </header>
  );
}