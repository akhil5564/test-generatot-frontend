
// @ts-nocheck
import { useEffect, useState } from "react";
import { Button, Modal, Card, Divider,message } from "antd";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../Components/common/PageHeader";
import SubjectDatatable from "./components/datatable";
import { Select } from "antd";
import { Input } from "antd";
import { IoIosSearch } from "react-icons/io";
import { API, GET, DELETE as DELETE_REQ } from "@/Components/common/api";

const Subjects = () => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterClass, setFilterClass] = useState<string | undefined>(undefined);
  const [filterSubject, setFilterSubject] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [rows, setRows] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [subjectsOptions, setSubjectsOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<any>(null);

  // Show Create Form
  const showCreateForm = () => {
    navigate("/chaptersform/new");
  };

  // Handle Edit Click
  const handleEdit = (record: any) => {
    setEditingId(record.id);
    navigate(`/chaptersform/${record.id}`);
  };

  // Handle Delete Confirm
  const handleDelete = async (id: string | number) => {
    try {
      await DELETE_REQ(`${API.CHAPTER}/${id}`);
      message.success(`Chapter ${id} deleted successfully!`);
      fetchChapters({ pageSize, page: currentPage, q: searchValue, cls: filterClass, subj: filterSubject });
    } catch (e: any) {
      message.error(e?.message || 'Failed to delete chapter');
    }
  };

  // Handle View Click
  const handleView = (record: any) => {
    setViewRecord(record);
    setIsViewOpen(true);
  };

  useEffect(() => {
    fetchChapters({ pageSize, page: currentPage });
    fetchSubjects();
  }, []);

  const fetchChapters = async (opts?: { q?: string, cls?: string, subj?: string, page?: number, pageSize?: number }) => {
    try {
      setLoading(true);
      const size = opts?.pageSize ?? pageSize ?? 10;
      const page = opts?.page ?? currentPage ?? 1;
      const query: any = { pageSize: size, page };
      if (opts?.q) query.book = opts.q;
      if (opts?.cls) query.class = opts.cls;
      if (opts?.subj) query.subject = opts.subj;
      const data = await GET(API.CHAPTERGET, query);
      const list = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
      const mapped = list.map((r: any) => {
        const chapters = Array.isArray(r?.chapters)
          ? r.chapters.map((c: any) => (typeof c === 'string' ? c : (c?.chapterName || c?.name || ""))).filter(Boolean)
          : [];
        return {
          id: r?._id || r?.id,
          key: r?._id || r?.id,
          title: r?.book || r?.title || "",
          subject: r?.subject || "",
          class: String(r?.class ?? ""),
          chapters,
        };
      });
      setRows(mapped);
      setTotal(data?.total || data?.count || mapped.length);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const data = await GET(API.ALL_SUBJECTS);
      const subjectsList = Array.isArray(data?.results)
        ? data.results.map((s: any) => ({ value: s.subject, label: s.subject }))
        : Array.isArray(data?.subjects)
          ? data.subjects.map((s: any) => ({ value: s.name ?? s.subject, label: s.name ?? s.subject }))
          : [];
      setSubjectsOptions(subjectsList);
    } catch (e) {
      setSubjectsOptions([
        { value: "Malayalam", label: "Malayalam" },
        { value: "English", label: "English" },
        { value: "Maths", label: "Maths" },
        { value: "GK", label: "GK" },
        { value: "Computer", label: "Computer" },
        { value: "EVS", label: "EVS" },
        { value: "Social Science", label: "Social Science" },
        { value: "Science", label: "Science" },
      ]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    fetchChapters({ q: value, cls: filterClass, subj: filterSubject });
  };

  return (
    <>
      <PageHeader title="Chapters" backButton={true}>
        <Select
          placeholder="Filter by Class"
          showSearch
          allowClear
          style={{ width: 180, marginRight: 8 }}
          onChange={(value) => {
            setFilterClass(value);
            fetchChapters({ q: searchValue, cls: value, subj: filterSubject });
          }}
          className="font-local2"
          options={[
            { value: "0", label: "0" },
            { value: "LKG", label: "LKG" },
            { value: "UKG", label: "UKG" },
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
            { value: "5", label: "5" },
            { value: "6", label: "6" },
            { value: "7", label: "7" },
            { value: "8", label: "8" },
          ]}
        />
        <Select
          placeholder="Filter by Subject"
          allowClear
          showSearch
          style={{ width: 180, marginRight: 8 }}
          onChange={(value) => {
            setFilterSubject(value);
            fetchChapters({ q: searchValue, cls: filterClass, subj: value });
          }}
          className="font-local2"
          options={subjectsOptions}
          loading={subjectsLoading}
        />
        <Input
          placeholder="Search by book"
          prefix={<IoIosSearch className="text-gray-400" />}
          allowClear
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="border-gray-300 focus:border-gray-300 focus:ring-0 focus:outline-none focus:shadow-none w-56"
          style={{
            backgroundColor: "#f9fafb",
            color: "#374151",
            border: "1px solid #d1d5db",
          }}
        />
        <Button
          type="primary"
          style={{ backgroundColor: "#007575", color: "white" }}
          className="font-local2"
          onClick={showCreateForm}
        >
          Create Chapter
        </Button>
      </PageHeader>

      <SubjectDatatable
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        data={rows}
        loading={loading}
        currentPage={currentPage}
        pageSize={pageSize}
        total={total}
        editingId={editingId}
        onChangePageParams={({ page, pageSize: ps }) => {
          const newPageSize = ps || pageSize;
          const newPage = page || currentPage;
          if (ps && ps !== pageSize) setPageSize(ps);
          if (page && page !== currentPage) setCurrentPage(page);
          fetchChapters({ q: searchValue || undefined, cls: filterClass, subj: filterSubject, page: newPage, pageSize: newPageSize });
        }}
      />

      {/* View Modal */}
      <Modal
        title="Chapter Details"
        open={isViewOpen}
        footer={null}
        onCancel={() => setIsViewOpen(false)}
        centered
        width={800}
        className="subject-view-modal"
        style={{ maxHeight: "80vh" }}
        bodyStyle={{ maxHeight: "70vh", overflowY: "auto", padding: 16 }}
        destroyOnClose
        afterOpenChange={(open) => {
          if (open) {
            const body = document.querySelector('.subject-view-modal .ant-modal-body') as HTMLElement | null;
            if (body) body.scrollTo({ top: 0 });
          }
        }}
      >
        {viewRecord && (
          <div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Title:</span>
                <span className="font-local2 text-lg text-gray-900">{viewRecord.title}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Subject:</span>
                <span className="font-local2 text-lg text-blue-600">{viewRecord.subject}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Class:</span>
                <span className="font-local2 text-lg text-purple-600">{viewRecord.class}</span>
              </div>

              <Divider orientation="left">Chapters</Divider>

              <div className="space-y-4">
                {viewRecord.chapters?.length > 0 ? (
                  viewRecord.chapters.map((chapter: any, idx: number) => (
                    <Card
                      key={idx}
                      size="small"
                      title={
                        <h3 className="font-local2 text-purple-600 font-semibold">
                          {idx + 1}. {typeof chapter === 'string' ? chapter : chapter?.chapterName}
                        </h3>
                      }
                      className="bg-blue-50"
                    />
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">No chapters added yet</div>
                )}
              </div>

              {/* Removed textbooks section as requested */}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default Subjects;