import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Typography, TextField, Select, MenuItem,
  FormControl, InputLabel, Box, TablePagination, CircularProgress,
  Backdrop, Chip, InputAdornment, Button, Tooltip, Avatar,
  Drawer, Divider,
} from "@mui/material";
import DeleteIcon      from "@mui/icons-material/Delete";
import DownloadIcon    from "@mui/icons-material/Download";
import VisibilityIcon  from "@mui/icons-material/Visibility";
import SearchIcon      from "@mui/icons-material/Search";
import FilterListIcon  from "@mui/icons-material/FilterList";
import RefreshIcon     from "@mui/icons-material/Refresh";
import DescriptionIcon from "@mui/icons-material/Description";
import CommentIcon     from "@mui/icons-material/Comment";
import SendIcon        from "@mui/icons-material/Send";
import EditIcon        from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Swal from "sweetalert2";


interface Document {
  id: number;
  letter_id: number;
  cycle_id: string;
  ref_no: string;
  subject: string;
  department: string;
  category: string;
  status: string;
  priority: string;
  due_date: string;
  next_due_date?: string;
  cycle_no?: number;
  file?: string | null;
  assigned_to?: string;
  assigned_head?: string;
}

interface Comment {
  id: number;
  letter_id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  completed:     { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
  "in-progress": { color: "#2196f3", bg: "#e3f2fd", text: "#1565c0" },
  pending:       { color: "#ff9800", bg: "#fff8e1", text: "#e65100" },
  draft:         { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" },
  forwarded:     { color: "#9c27b0", bg: "#f3e5f5", text: "#6a1b9a" },
  overdue:       { color: "#f44336", bg: "#ffebee", text: "#c62828" },
  rejected:      { color: "#795548", bg: "#efebe9", text: "#4e342e" },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  urgent: { color: "#f44336", bg: "#ffebee", text: "#c62828" },
  high:   { color: "#ff9800", bg: "#fff3e0", text: "#e65100" },
  medium: { color: "#ffc107", bg: "#fff8e1", text: "#f57c00" },
  low:    { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
};

const sC = (s: string) => STATUS_CONFIG[s]   || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
const pC = (p: string) => PRIORITY_CONFIG[p] || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };

// Rejected letters become "draft" after rejection — so include all three
const EDITABLE_STATUSES = ["pending", "rejected", "draft"];


const TaskView: React.FC = () => {
  const { user }  = useAuth();
  const userStr   = localStorage.getItem("user");
  const localUser = userStr ? JSON.parse(userStr) : null;

  const isSuperuser  = localUser?.is_superuser === true || localUser?.superadmin === 1;
  const isStaff      = localUser?.is_staff     === true || localUser?.is_staff   === 1;
  const isSuperAdmin = isSuperuser && !isStaff;
  const isDirector   = isSuperuser && isStaff;
  const isRegularUser = !isSuperuser;   // only regular users get the Edit button

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filtered,  setFiltered]  = useState<Document[]>([]);
  const [loading,   setLoading]   = useState(false);

  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const [page,        setPage]        = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [selectedLetterId,  setSelectedLetterId]  = useState<number | null>(null);
  const [selectedLetterRef, setSelectedLetterRef] = useState<string>("");
  const [comments,          setComments]          = useState<Comment[]>([]);
  const [newComment,        setNewComment]        = useState("");
  const [commentLoading,    setCommentLoading]    = useState(false);


  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const stored    = localStorage.getItem("user");
      let superAdmin  = false;
      if (stored) {
        const u        = JSON.parse(stored);
        const su       = u.is_superuser === true || u.superadmin === 1;
        const st       = u.is_staff     === true || u.is_staff   === 1;
        superAdmin     = su && !st;
      }
      const res = await api.get(superAdmin ? "/letters/all/" : "/letters/");

      const letterMap = new Map<number, Document>();
      res.data.forEach((item: any) => {
        const doc: Document = {
          id:            item.id        || item.letter_id,
          letter_id:     item.letter_id || item.id,
          cycle_id:      item._id,
          ref_no:        item.ref_no,
          subject:       item.subject,
          department:    item.department,
          category:      item.category,
          status:        (item.status || "").replace(/\s+/g, "-").toLowerCase(),
          priority:      item.priority,
          due_date:      item.due_date,
          next_due_date: item.next_due_date,
          cycle_no:      item.cycle_no,
          file:          item.file,
          assigned_to:   item.assigned_to,
          assigned_head: item.assigned_head,
        };
        const existing = letterMap.get(doc.letter_id);
        if (!existing || (doc.cycle_no && (existing.cycle_no ?? 0) < doc.cycle_no)) {
          letterMap.set(doc.letter_id, doc);
        }
      });
      const docs = Array.from(letterMap.values());
      setDocuments(docs);
      setFiltered(docs);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Unable to fetch tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchDocuments(); }, [user]);

  useEffect(() => {
    let temp = [...documents];
    if (search)   temp = temp.filter(d => `${d.ref_no} ${d.subject} ${d.department}`.toLowerCase().includes(search.toLowerCase()));
    if (status)   temp = temp.filter(d => d.status === status);
    if (priority) temp = temp.filter(d => d.priority === priority);
    if (category) temp = temp.filter(d => d.category === category);
    setFiltered(temp);
    setPage(0);
  }, [search, status, priority, category, documents]);


  const openComments = async (letterId: number, refNo: string) => {
    setSelectedLetterId(letterId);
    setSelectedLetterRef(refNo);
    setComments([]);
    setNewComment("");
    setCommentDrawerOpen(true);
    setCommentLoading(true);
    try {
      const res = await api.get(`/letters/${letterId}/comments/`);
      setComments(res.data);
    } catch { setComments([]); }
    finally  { setCommentLoading(false); }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedLetterId) return;
    try {
      setCommentLoading(true);
      const res = await api.post(`/letters/${selectedLetterId}/comments/`, { comment: newComment.trim() });
      setComments(prev => [res.data, ...prev]);
      setNewComment("");
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Could not post comment", "error");
    } finally { setCommentLoading(false); }
  };

  const MIME_TO_EXT: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "image/jpeg": ".jpg",
    "image/png":  ".png",
  };

  const downloadFile = async (letterId: number, refNo: string, fileUrl?: string | null) => {
    try {
      const res = await api.get(`/letters/${letterId}/download/`, { responseType: "blob" });
      const contentType = (res.headers["content-type"] as string ?? "application/octet-stream").split(";")[0].trim();
      let filename = "";
      const disposition = res.headers["content-disposition"] as string | undefined;
      if (disposition) {
        const match =
          disposition.match(/filename\*=(?:UTF-8'')?([^\s;]+)/i) ||
          disposition.match(/filename="?([^";\r\n]+)"?/i);
        if (match?.[1]) filename = decodeURIComponent(match[1].trim());
      }
      if (!filename && fileUrl) {
        const storedName = fileUrl.split("?")[0].split("/").pop() ?? "";
        if (storedName.includes(".")) filename = `${refNo}_${storedName}`;
      }
      if (!filename) filename = `${refNo}_file${MIME_TO_EXT[contentType] ?? ""}`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }));
      const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Download failed", "error");
    }
  };

  const deleteLetter = async (letterId: number) => {
    const { isConfirmed } = await Swal.fire({
      title: "Delete Task?", text: "This cannot be undone!", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#d33", cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
    });
    if (!isConfirmed) return;
    try {
      setLoading(true);
      await api.delete(`/letters/${letterId}/delete/`);
      Swal.fire("Deleted!", "Task removed successfully", "success");
      fetchDocuments();
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Could not delete", "error");
    } finally { setLoading(false); }
  };

  const clearFilters = () => { setSearch(""); setStatus(""); setPriority(""); setCategory(""); };
  const activeCount  = [search, status, priority, category].filter(Boolean).length;
  const pendingCount = documents.filter(d => d.status === "pending").length;

  return (
    <Box sx={{ p: 3, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: "1700px", margin: "0 auto" }}>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", mr: 2, width: 48, height: 48 }}>
              <DescriptionIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                {isSuperAdmin ? "All Tasks" : isDirector ? "Director Tasks" : "My Tasks"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isSuperAdmin
                  ? `Viewing all ${documents.length} tasks${pendingCount > 0 ? ` • ${pendingCount} pending approval` : ""}`
                  : isDirector
                  ? `Tasks under your supervision: ${documents.length}`
                  : `View and manage ${documents.length} tasks assigned to you`}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: "1px solid #e0e0e0" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <FilterListIcon sx={{ mr: 1, color: "#1a237e" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#1a237e" }}>Filters</Typography>
            {activeCount > 0 && <Chip label={`${activeCount} active`} size="small" color="primary" sx={{ ml: 2 }} />}
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" onClick={clearFilters} disabled={activeCount === 0} sx={{ mr: 1 }}>Clear All</Button>
            <Button variant="contained" size="small" startIcon={<RefreshIcon />} onClick={fetchDocuments}
              sx={{ bgcolor: "#1a237e", "&:hover": { bgcolor: "#0d47a1" } }}>
              Refresh
            </Button>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <TextField label="Search Tasks" size="small" sx={{ minWidth: 260, flexGrow: 1 }}
              value={search} onChange={e => setSearch(e.target.value)} placeholder="subject, department"
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={e => setStatus(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="forwarded">Forwarded</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={priority} label="Priority" onChange={e => setPriority(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={e => setCategory(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Datay">Data</MenuItem>
                <MenuItem value="Graphs">Graphs</MenuItem>
                <MenuItem value="Letter">Letter</MenuItem>
                <MenuItem value="Reports">Reports</MenuItem>
                <MenuItem value="White Papers">White Papers</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Table */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  {["Subject","Department","Category","Status","Priority","Due Date","Next Due","Assigned To","Head","Actions"].map(h => (
                    <TableCell key={h} sx={{ color: "white", fontWeight: "bold", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Box sx={{ py: 8 }}>
                        <DescriptionIcon sx={{ fontSize: 64, color: "#bdbdbd", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          {activeCount > 0 ? "No tasks match your filters" : "No tasks available"}
                        </Typography>
                        {activeCount > 0 && <Button variant="outlined" onClick={clearFilters} sx={{ mt: 2 }}>Clear Filters</Button>}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => {
                    const sc = sC(row.status);
                    const pc = pC(row.priority);
                    const showEdit = isRegularUser && EDITABLE_STATUSES.includes(row.status);

                    return (
                      <TableRow key={`${row.letter_id}-${row.cycle_no ?? 1}`} hover
                        sx={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa", "&:hover": { backgroundColor: "#f0f4ff !important" } }}>

                        <TableCell sx={{ maxWidth: 220 }}>
                          <Tooltip title={row.subject}>
                            <Typography variant="body2" noWrap>{row.subject}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell><Typography variant="body2">{row.department}</Typography></TableCell>
                        <TableCell>
                          <Chip label={row.category} size="small"
                            sx={{ backgroundColor: "#e0e7ff", color: "#3730a3", fontWeight: 500, fontSize: "0.7rem" }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={row.status.replace("-", " ")} size="small"
                            sx={{ backgroundColor: sc.bg, color: sc.text, fontWeight: 600, textTransform: "capitalize", fontSize: "0.7rem", border: `1px solid ${sc.color}` }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={row.priority} size="small"
                            sx={{ backgroundColor: pc.bg, color: pc.text, fontWeight: 600, textTransform: "capitalize", fontSize: "0.7rem", border: `1px solid ${pc.color}` }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                            {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                            {row.next_due_date ? new Date(row.next_due_date).toLocaleDateString() : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.assigned_to || "—"} size="small" variant="outlined"
                            sx={{ fontSize: "0.7rem", borderColor: "#90caf9", color: "#1565c0" }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={row.assigned_head || "—"} size="small" variant="outlined"
                            sx={{ fontSize: "0.7rem", borderColor: "#ce93d8", color: "#6a1b9a" }} />
                        </TableCell>

                        <TableCell align="center">
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", flexWrap: "wrap" }}>
                            <Tooltip title="View History">
                              <IconButton size="small" onClick={() => navigate(`/history/${row.letter_id}`)}
                                sx={{ color: "#1976d2", "&:hover": { backgroundColor: "#e3f2fd" } }}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {/* Edit: regular users only, pending / rejected / draft */}
                            {showEdit && (
                              <Tooltip title={`Edit Task (${row.status})`}>
                                <IconButton size="small" onClick={() => navigate(`/letters/${row.letter_id}/edit`)}
                                  sx={{ color: "#f57c00", "&:hover": { backgroundColor: "#fff3e0" } }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {row.file && (
                              <Tooltip title="Download File">
                                <IconButton size="small" onClick={() => downloadFile(row.letter_id, row.ref_no, row.file)}
                                  sx={{ color: "#2e7d32", "&:hover": { backgroundColor: "#e8f5e9" } }}>
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {isSuperAdmin && (
                              <Tooltip title="Comments">
                                <IconButton size="small" onClick={() => openComments(row.letter_id, row.ref_no)}
                                  sx={{ color: "#7b1fa2", "&:hover": { backgroundColor: "#f3e5f5" } }}>
                                  <CommentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            <Tooltip title="Delete Task">
                              <IconButton size="small" onClick={() => deleteLetter(row.letter_id)}
                                sx={{ color: "#d32f2f", "&:hover": { backgroundColor: "#ffebee" } }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={filtered.length} page={page}
            onPageChange={(_e, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            sx={{ borderTop: "1px solid #e0e0e0", backgroundColor: "#fafafa" }}
          />
        </Paper>
      </Box>

      {/* Comment Drawer */}
      <Drawer anchor="right" open={commentDrawerOpen} onClose={() => setCommentDrawerOpen(false)}
        PaperProps={{ sx: { width: 420, display: "flex", flexDirection: "column" } }}>
        <Box sx={{ p: 3, backgroundColor: "#1a237e", color: "white", flexShrink: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Comments</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>{selectedLetterRef || `Letter #${selectedLetterId}`}</Typography>
        </Box>
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0", backgroundColor: "#fafafa", flexShrink: 0 }}>
          <TextField fullWidth multiline minRows={2} maxRows={4} placeholder="Write a comment…"
            value={newComment} onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) submitComment(); }}
            size="small" sx={{ mb: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="contained" size="small" endIcon={<SendIcon />} onClick={submitComment}
              disabled={!newComment.trim() || commentLoading}
              sx={{ bgcolor: "#1a237e", "&:hover": { bgcolor: "#0d47a1" } }}>
              {commentLoading ? "Posting…" : "Post (Ctrl+Enter)"}
            </Button>
          </Box>
        </Box>
        <Box sx={{ overflowY: "auto", flex: 1, p: 2 }}>
          {commentLoading && comments.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress size={32} /></Box>
          ) : comments.length === 0 ? (
            <Box sx={{ textAlign: "center", mt: 6, color: "#9e9e9e" }}>
              <CommentIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body2">No comments yet.</Typography>
            </Box>
          ) : (
            comments.map((c, i) => (
              <Box key={c.id}>
                <Box sx={{ py: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#1a237e" }}>{c.username}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(c.created_at).toLocaleString()}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: "#333", whiteSpace: "pre-wrap" }}>{c.comment}</Typography>
                </Box>
                {i < comments.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </Box>
      </Drawer>

      <Backdrop open={loading} sx={{ color: "#fff", zIndex: 9999 }}>
        <CircularProgress color="inherit" size={60} />
      </Backdrop>
    </Box>
  );
};

export default TaskView;