import { useEffect, useState } from "react";
import Papa from "papaparse";
import Header from "./components/Header";
import Filters from "./components/Filters";
import Item from "./components/Item";
import AddItemForm from "./components/AddItemForm";

export default function App() {
  const [people, setPeople] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false); // Changed from true to false

  // Fetch people from Sheet2 (CSV)
  useEffect(() => {
    async function fetchPeople() {
      try {
        const res = await fetch(
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwP9TArqr5ywbr3QPInHvn1-akmNT85xPfzeCSn2Q8ukWHUhekSciToFImmkg5hdmeyciPxqpy9Vzs/pub?gid=526175628&single=true&output=csv"
        );
        const csvText = await res.text();
        
        const parsed = Papa.parse(csvText, { 
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        });
        
        setPeople(parsed.data.map(row => row.name).filter(Boolean));
      } catch (err) {
        console.error("Failed to fetch people:", err);
      }
    }
    fetchPeople();
  }, []);

  // Fetch items from Sheet1 (CSV)
  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch(
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwP9TArqr5ywbr3QPInHvn1-akmNT85xPfzeCSn2Q8ukWHUhekSciToFImmkg5hdmeyciPxqpy9Vzs/pub?output=csv"
        );
        const csvText = await res.text();

        const parsed = Papa.parse(csvText, { 
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        });
        
        setItems(parsed.data);
        console.log("Parsed items:", parsed.data);
      } catch (err) {
        console.error("Failed to fetch items:", err);
      }
    }
    fetchItems();
  }, []);

  return (
    <div className="App">
      <Header showForm={showForm} setShowForm={setShowForm} />

      {showForm ? (
        <AddItemForm peopleList={people} onCancel={() => setShowForm(false)} />
      ) : (
        <>
          <Filters onAddClick={() => setShowForm(true)} />
          <main className="items">
            {items.length === 0 ? (
              <p>No items yet. Add your first memory!</p>
            ) : (
              items.map((row, idx) => {
                let images = [];
                try {
                  if (row.image_ids && typeof row.image_ids === 'string') {
                    images = JSON.parse(row.image_ids).map(
                      id => `https://drive.google.com/uc?export=view&id=${id}`
                    );
                  }
                } catch (e) {
                  console.error("Error parsing image_ids:", e);
                }

                return (
                  <Item
                    key={row.item_id || row.title || idx}
                    person={row.person_given_by}
                    title={row.title}
                    description={row.description}
                    images={images}
                    audio={row.audio_id ? `https://drive.google.com/uc?export=view&id=${row.audio_id}` : null}
                  />
                );
              })
            )}
          </main>
        </>
      )}
    </div>
  );
}