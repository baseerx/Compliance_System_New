import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  TablePagination,
  CircularProgress,
  Backdrop,
  Chip,
  InputAdornment,
  Button,
  Tooltip,
  Avatar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import DescriptionIcon from "@mui/icons-material/Description";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Swal from "sweetalert2";

interface Document {
  id: number;
  letter_id: number;
  cycle_id: number;
  ref_no: string;
  subject: string;
  sender: string;
  receiver: string;
  category: string;
  status: string;
  priority: string;
  due_date: string;
  next_due_date?: string;
  cycle_no?: number;
  file?: string | null;
}

const TaskView: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filtered, setFiltered] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const res = await api.get("/letters/");

      const letterMap = new Map<number, Document>();

      res.data.forEach((item: any) => {
        const doc: Document = {
          id: item.id || item.letter_id,
          letter_id: item.letter_id || item.id,
          cycle_id: item._id,
          ref_no: item.ref_no,
          subject: item.subject,
          sender: item.sender,
          receiver: item.receiver,
          category: item.category,
          status: item.status?.replace(/\s+/g, "-").toLowerCase() || "in-progress",
          priority: item.priority,
          due_date: item.due_date,
          next_due_date: item.next_due_date,
          cycle_no: item.cycle_no,
          file: item.file,
        };

        const existingDoc = letterMap.get(doc.letter_id);
        if (!existingDoc || (doc.cycle_no && existingDoc.cycle_no && doc.cycle_no > existingDoc.cycle_no)) {
          letterMap.set(doc.letter_id, doc);
        }
      });

      const uniqueDocuments = Array.from(letterMap.values());
      
      setDocuments(uniqueDocuments);
      setFiltered(uniqueDocuments);
      
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Unable to fetch tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    let temp = [...documents];

    if (search) {
      temp = temp.filter((d) =>
        `${d.ref_no} ${d.subject} ${d.sender} ${d.receiver}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    if (status) temp = temp.filter((d) => d.status === status);
    if (priority) temp = temp.filter((d) => d.priority === priority);
    if (category) temp = temp.filter((d) => d.category === category);

    setFiltered(temp);
    setPage(0);
  }, [search, status, priority, category, documents]);

  const downloadFile = async (letterId: number, refNo: string) => {
    try {
      const response = await api.get(`/letters/${letterId}/download/`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${refNo}_file`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      Swal.fire("Success", "File downloaded successfully", "success");
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Download failed", "error");
    }
  };

  const deleteLetter = async (letterId: number, refNo: string) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: `You won't be able to revert this!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await api.delete(`/letters/${letterId}/delete/`);
        Swal.fire("Deleted!", "Task removed successfully", "success");
        fetchDocuments();
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.error || "Could not delete task", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const viewHistory = (letterId: number) => {
    navigate(`/history/${letterId}`);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setCategory("");
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; text: string }> = {
      completed: { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
      "in-progress": { color: "#2196f3", bg: "#e3f2fd", text: "#1565c0" },
      draft: { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" },
      forwarded: { color: "#ff9800", bg: "#fff3e0", text: "#e65100" },
      overdue: { color: "#f44336", bg: "#ffebee", text: "#c62828" },
    };
    return configs[status] || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { color: string; bg: string; text: string }> = {
      urgent: { color: "#f44336", bg: "#ffebee", text: "#c62828" },
      high: { color: "#ff9800", bg: "#fff3e0", text: "#e65100" },
      medium: { color: "#ffc107", bg: "#fff8e1", text: "#f57c00" },
      low: { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
    };
    return configs[priority] || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
  };

  const activeFiltersCount = [search, status, priority, category].filter(Boolean).length;

  return (
    <Box sx={{ p: 3, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: "1600px", margin: "0 auto" }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", mr: 2, width: 48, height: 48 }}>
              <DescriptionIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Task Management
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Filters Section */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            backgroundColor: "#ffffff"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <FilterListIcon sx={{ mr: 1, color: "#1a237e" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#1a237e" }}>
              Filters
            </Typography>
            {activeFiltersCount > 0 && (
              <Chip 
                label={`${activeFiltersCount} active`} 
                size="small" 
                color="primary"
                sx={{ ml: 2 }}
              />
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
              sx={{ mr: 1 }}
            >
              Clear All
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchDocuments}
              sx={{
                bgcolor: "#1a237e",
                "&:hover": { bgcolor: "#0d47a1" }
              }}
            >
              Refresh
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <TextField
              label="Search Tasks"
              size="small"
              sx={{ minWidth: 280, flexGrow: 1 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              placeholder="Search by ref no, subject, sender, receiver..."
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select 
                value={status} 
                label="Status" 
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="forwarded">Forwarded</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select 
                value={priority} 
                label="Priority" 
                onChange={(e) => setPriority(e.target.value)}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select 
                value={category} 
                label="Category" 
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="Notice">Notice</MenuItem>
                <MenuItem value="Memo">Memo</MenuItem>
                <MenuItem value="Circular">Circular</MenuItem>
                <MenuItem value="Letter">Letter</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Results Count - REMOVED BORDER LINE */}
         
        </Paper>

        {/* Table */}
        <Paper 
          elevation={0}
          sx={{ 
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            overflow: "hidden"
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Ref No
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Subject
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Sender
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Receiver
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Category
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Priority
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Due Date
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Next Due
                  </TableCell>
                  <TableCell align="center" sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Box sx={{ py: 8 }}>
                        <DescriptionIcon sx={{ fontSize: 64, color: "#bdbdbd", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          {search || status || priority || category 
                            ? "No tasks match your filters" 
                            : "No tasks available"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {search || status || priority || category
                            ? "Try adjusting your search criteria"
                            : "Create your first task to get started"}
                        </Typography>
                        {activeFiltersCount > 0 && (
                          <Button 
                            variant="outlined" 
                            onClick={clearFilters}
                            sx={{ mt: 2 }}
                          >
                            Clear Filters
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => {
                      const statusConfig = getStatusConfig(row.status);
                      const priorityConfig = getPriorityConfig(row.priority);

                      return (
                        <TableRow 
                          hover 
                          key={`${row.letter_id}-${row.cycle_no || 1}`}
                          sx={{
                            backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                            "&:hover": {
                              backgroundColor: "#f0f4ff !important",
                            },
                            transition: "background-color 0.2s"
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a237e" }}>
                              {row.ref_no}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 250 }}>
                            <Tooltip title={row.subject}>
                              <Typography variant="body2" noWrap>
                                {row.subject}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.sender}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.receiver}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={row.category} 
                              size="small"
                              sx={{
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3",
                                fontWeight: 500,
                                fontSize: "0.75rem"
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.status.replace("-", " ")}
                              size="small"
                              sx={{
                                backgroundColor: statusConfig.bg,
                                color: statusConfig.text,
                                fontWeight: 600,
                                textTransform: "capitalize",
                                fontSize: "0.75rem",
                                border: `1px solid ${statusConfig.color}`,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.priority}
                              size="small"
                              sx={{
                                backgroundColor: priorityConfig.bg,
                                color: priorityConfig.text,
                                fontWeight: 600,
                                textTransform: "capitalize",
                                fontSize: "0.75rem",
                                border: `1px solid ${priorityConfig.color}`,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Date(row.due_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {row.next_due_date 
                                ? new Date(row.next_due_date).toLocaleDateString() 
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                              <Tooltip title="View History">
                                <IconButton
                                  size="small"
                                  onClick={() => viewHistory(row.letter_id)}
                                  sx={{
                                    color: "#1976d2",
                                    "&:hover": { backgroundColor: "#e3f2fd" }
                                  }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              {row.file && (
                                <Tooltip title="Download File">
                                  <IconButton
                                    size="small"
                                    onClick={() => downloadFile(row.letter_id, row.ref_no)}
                                    sx={{
                                      color: "#2e7d32",
                                      "&:hover": { backgroundColor: "#e8f5e9" }
                                    }}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}

                              <Tooltip title="Delete Task">
                                <IconButton
                                  size="small"
                                  onClick={() => deleteLetter(row.letter_id, row.ref_no)}
                                  sx={{
                                    color: "#d32f2f",
                                    "&:hover": { backgroundColor: "#ffebee" }
                                  }}
                                >
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

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              borderTop: "1px solid #e0e0e0",
              backgroundColor: "#fafafa"
            }}
          />
        </Paper>
      </Box>

      <Backdrop open={loading} sx={{ color: "#fff", zIndex: 9999 }}>
        <CircularProgress color="inherit" size={60} />
      </Backdrop>
    </Box>
  );
};

export default TaskView;