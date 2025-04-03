const MachineCodeView = ({ machineCode, currentPC, isByteSwapped, onBinaryLineClick, selectedBinaryAddr }) => {
  // ... existing state and functions ...

  return (
    <div className="card bg-base-100">
      <div className="card-body">
        <h3 className="card-title">Machine Code</h3>
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Address</th>
                <th>Byte 1</th>
                <th>Byte 2</th>
                <th>Binary</th>
              </tr>
            </thead>
            <tbody>
              {machineCode && Array.from({ length: Math.ceil(machineCode.length / 2) }).map((_, i) => {
                const byte1 = machineCode[i * 2];
                const byte2 = machineCode[i * 2 + 1];
                const isCurrent = i + 1 === currentPC;
                const isSelected = i + 1 === selectedBinaryAddr;
                const binary = isByteSwapped 
                  ? byte2.toString(2).padStart(8, '0') + byte1.toString(2).padStart(8, '0')
                  : byte1.toString(2).padStart(8, '0') + byte2.toString(2).padStart(8, '0');

                return (
                  <tr
                    key={i}
                    className={`hover:bg-base-300 cursor-pointer ${
                      isCurrent ? 'bg-primary text-primary-content' : 
                      isSelected ? 'bg-secondary text-secondary-content' : ''
                    }`}
                    onClick={() => onBinaryLineClick(i + 1)}
                  >
                    <td>0x{(i * 2).toString(16).padStart(4, '0')}</td>
                    <td>0x{byte1.toString(16).padStart(2, '0')}</td>
                    <td>0x{byte2.toString(16).padStart(2, '0')}</td>
                    <td className="font-mono">{binary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MachineCodeView; 