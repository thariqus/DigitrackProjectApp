function PropertyDetail({ property }: any) {
  return (
    <div className="space-y-3">
      <p><b>Name:</b> {property.property_name}</p>
      <p><b>Emirate:</b> {property.emirate}</p>
      <p><b>Type:</b> {property.type}</p>
      <p><b>Rent:</b> {property.current_rent}</p>

      {/* Later */}
      <div className="mt-4">
        <h3 className="font-semibold">Renewal History</h3>
        {/* show renewal list */}
      </div>
    </div>
  );
}

export default PropertyDetail;