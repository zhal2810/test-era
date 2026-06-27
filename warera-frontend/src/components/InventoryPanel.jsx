// Di dalam komponen InventoryPanel.jsx
const fetchInventory = async () => {
  const res = await fetchWarera('inventory.fetchCurrentEquipment', { 
    userId: userId 
  });
  setInventory(res.data);
};