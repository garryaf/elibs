import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MasterDataTable, renderCellValue } from "../MasterDataTable";

describe("renderCellValue helper", () => {
  it("renders dash for null and undefined", () => {
    expect(renderCellValue(null)).toBe("—");
    expect(renderCellValue(undefined)).toBe("—");
  });

  it("renders primitive values directly as string", () => {
    expect(renderCellValue("Hematologi")).toBe("Hematologi");
    expect(renderCellValue(120)).toBe("120");
    expect(renderCellValue(true)).toBe("true");
  });

  it("extracts human-readable name, label, or code from relation objects", () => {
    expect(renderCellValue({ id: "1", name: "Kategori Kimia" })).toBe("Kategori Kimia");
    expect(renderCellValue({ id: "2", label: "Label Option" })).toBe("Label Option");
    expect(renderCellValue({ id: "3", code: "HEM01" })).toBe("HEM01");
    expect(renderCellValue({ id: "4", unknownField: "test" })).toBe("—");
  });
});

describe("MasterDataTable component", () => {
  const columns = [
    { key: "code", label: "Kode" },
    { key: "name", label: "Nama" },
    { key: "category", label: "Kategori" },
  ];

  const mockData = [
    { id: "row-1", code: "KD01", name: "Glukosa Puasa", category: { name: "Kimia Darah" } },
    { id: "row-2", code: "KD02", name: "Kolesterol Total", category: { name: "Profil Lipid" } },
  ];

  it("renders skeleton when isLoading is true", () => {
    const { container } = render(
      <MasterDataTable columns={columns} data={[]} isLoading onSearch={jest.fn()} />
    );
    expect(screen.getByPlaceholderText("Cari...")).toBeDisabled();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders table headers, row data, and formats relation objects correctly", () => {
    render(<MasterDataTable columns={columns} data={mockData} />);

    expect(screen.getByText("KODE")).toBeInTheDocument();
    expect(screen.getByText("NAMA")).toBeInTheDocument();
    expect(screen.getByText("KATEGORI")).toBeInTheDocument();

    expect(screen.getByText("KD01")).toBeInTheDocument();
    expect(screen.getByText("Glukosa Puasa")).toBeInTheDocument();
    expect(screen.getByText("Kimia Darah")).toBeInTheDocument();

    expect(screen.getByText("KD02")).toBeInTheDocument();
    expect(screen.getByText("Kolesterol Total")).toBeInTheDocument();
    expect(screen.getByText("Profil Lipid")).toBeInTheDocument();
  });

  it("displays empty state when data is empty", () => {
    render(<MasterDataTable columns={columns} data={[]} />);
    expect(screen.getByText("Tidak ada data yang ditemukan.")).toBeInTheDocument();
  });

  it("fires onSearch after debounce delay", () => {
    jest.useFakeTimers();
    const handleSearch = jest.fn();
    render(<MasterDataTable columns={columns} data={mockData} onSearch={handleSearch} />);

    const searchInput = screen.getByPlaceholderText("Cari...");
    act(() => {
      fireEvent.change(searchInput, { target: { value: "Glukosa" } });
    });

    handleSearch.mockClear();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(handleSearch).toHaveBeenCalledWith("Glukosa");
    jest.useRealTimers();
  });

  it("handles bulk selection and bulk delete confirmation", () => {
    const handleBulkDelete = jest.fn();
    window.confirm = jest.fn(() => true);

    render(
      <MasterDataTable
        columns={columns}
        data={mockData}
        onBulkDelete={handleBulkDelete}
      />
    );

    const selectAllCheckbox = screen.getByLabelText("Pilih semua");
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText("2 dipilih")).toBeInTheDocument();

    const deleteBtn = screen.getByText("Hapus Terpilih");
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith("Hapus 2 data yang dipilih?");
    expect(handleBulkDelete).toHaveBeenCalledWith(["row-1", "row-2"]);
  });

  it("triggers onEdit and onDelete callbacks", () => {
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();

    render(
      <MasterDataTable
        columns={columns}
        data={mockData}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    const editBtn = screen.getByLabelText("Edit Glukosa Puasa");
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockData[0]);

    const deleteBtn = screen.getByLabelText("Hapus Kolesterol Total");
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(mockData[1]);
  });

  it("renders duplicate badge when duplicateNames contains item name", () => {
    const duplicates = new Set(["Glukosa Puasa"]);
    render(
      <MasterDataTable
        columns={columns}
        data={mockData}
        duplicateNames={duplicates}
      />
    );

    expect(screen.getByText("DUPLIKAT")).toBeInTheDocument();
  });

  it("toggles expandable row on click when renderExpandedRow is provided", () => {
    const renderExpanded = (row: Record<string, unknown>) => (
      <div data-testid="expanded-content">Detail untuk {String(row.name)}</div>
    );

    render(
      <MasterDataTable
        columns={columns}
        data={mockData}
        renderExpandedRow={renderExpanded}
      />
    );

    expect(screen.queryByTestId("expanded-content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Glukosa Puasa"));
    expect(screen.getByTestId("expanded-content")).toHaveTextContent("Detail untuk Glukosa Puasa");

    fireEvent.click(screen.getByText("Glukosa Puasa"));
    expect(screen.queryByTestId("expanded-content")).not.toBeInTheDocument();
  });

  it("renders pagination controls and triggers onPageChange", () => {
    const handlePageChange = jest.fn();
    render(
      <MasterDataTable
        columns={columns}
        data={mockData}
        meta={{ total: 50, page: 2, limit: 10, totalPages: 5 }}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByText(/Halaman/i)).toBeInTheDocument();

    const prevBtn = screen.getByLabelText("Halaman sebelumnya");
    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    const nextBtn = screen.getByLabelText("Halaman berikutnya");
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);

    const page4Btn = screen.getByLabelText("Halaman 4");
    fireEvent.click(page4Btn);
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });
});
