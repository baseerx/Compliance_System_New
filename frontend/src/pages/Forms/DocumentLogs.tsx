import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, CircularProgress, List, ListItem,
  ListItemText, Divider, Alert, Button, Chip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../../api/axios";
import Swal from "sweetalert2";


interface Log {
  id: number;
  action: string;
  message: string;
  old_status?: string;
  new_status?: string;
  old_due_date?: string;
  new_due_date?: string;
  next_due_date?: string;
  created_at: string;
}


const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string ; icon: string}> = {
  created:       { label: "Created",        color: "#1565c0", bg: "#e3f2fd", icon: "✅" },
  updated:       { label: "Updated",        color: "#6a1b9a", bg: "#f3e5f5", icon: "✏️" },
  status_change: { label: "Status Changed", color: "#e65100", bg: "#fff3e0", icon: "🔄" },
  recurred:      { label: "Recurred",       color: "#2e7d32", bg: "#e8f5e9", icon: "🔁" },
  overdue:       { label: "Overdue",        color: "#c62828", bg: "#ffebee", icon: "⚠️" },
  approved:      { label: "Approved",       color: "#2e7d32", bg: "#e8f5e9", icon: "✔️" },
  rejected:      { label: "Rejected",       color: "#c62828", bg: "#ffebee", icon: "❌" },
};

const getActionConfig = (action: string) =>
  ACTION_CONFIG[action] || { label: action.toUpperCase(), color: "#616161", bg: "#f5f5f5", icon: "📋" };


const DocumentLogs: React.FC = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [logs,         setLogs]         = useState<Log[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [letterRefNo,  setLetterRefNo]  = useState("");
  const [letterSubject,setLetterSubject]= useState("");

  useEffect(() => {
    if (!id) { setError("No task ID provided"); setLoading(false); return; }
    fetchLetterLogs();
    fetchLetterDetails();
  }, [id]);

  const fetchLetterLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/letters/history/${id}/`);
      setLogs(res.data);
      setError(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to load logs";
      setError(msg);
      Swal.fire("Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchLetterDetails = async () => {
    try {
      const res = await api.get(`/letters/${id}/`);
      setLetterRefNo(res.data.ref_no  || "");
      setLetterSubject(res.data.subject || "");
    } catch {
      
    }
  };


  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <CircularProgress sx={{ color: "#1a237e" }} />
        <Typography sx={{ mt: 2 }} color="text.secondary">Loading letter logs…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/document-view")} sx={{ mt: 2 }}>
          Back to Tasks
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>

     
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1a237e" }}>
            Task History
            {letterRefNo && (
              <Typography component="span" sx={{ ml: 1, color: "#555", fontWeight: 400, fontSize: "1rem" }}>
                — {letterRefNo}
              </Typography>
            )}
          </Typography>
          {letterSubject && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {letterSubject}
            </Typography>
          )}
        </Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}
          variant="outlined" size="small"
          sx={{ borderColor: "#1a237e", color: "#1a237e", "&:hover": { borderColor: "#0d47a1" } }}>
          Back
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 3, border: "1px solid #e0e0e0", overflow: "hidden" }}>
        {logs.length === 0 ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="info">No logs available for this letter.</Alert>
          </Box>
        ) : (
          <>
            <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e0e0e0", backgroundColor: "#f8f9fa",
              display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {logs.length} event{logs.length !== 1 ? "s" : ""} recorded
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[...new Set(logs.map(l => l.action))].map(action => {
                  const cfg = getActionConfig(action);
                  return (
                    <Chip key={action} label={`${cfg.label}`} size="small"
                      sx={{ backgroundColor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: "0.7rem" }} />
                  );
                })}
              </Box>
            </Box>

            <List disablePadding>
              {logs.map((log, index) => {
                const cfg = getActionConfig(log.action);

                return (
                  <React.Fragment key={log.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 3, py: 2.5 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: "50%",
                        backgroundColor: cfg.bg, border: `2px solid ${cfg.color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, mr: 2, mt: 0.5, fontSize: "1rem",
                      }}>{cfg.icon}
                        
                      </Box>

                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 0.5 }}>
                            <Chip label={cfg.label} size="small"
                              sx={{ backgroundColor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: "0.72rem" }} />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(log.created_at).toLocaleString("en-US", {
                                year: "numeric", month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="body2" sx={{ mb: 1, color: "#333" }}>
                              {log.message}
                            </Typography>

                            {log.old_status && log.new_status && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Status:
                                </Typography>
                                <Chip label={log.old_status} size="small"
                                  sx={{ backgroundColor: "#ffebee", color: "#c62828", fontSize: "0.68rem",
                                    textDecoration: "line-through", height: 20 }} />
                                <Typography variant="caption">→</Typography>
                                <Chip label={log.new_status} size="small"
                                  sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32", fontWeight: 700,
                                    fontSize: "0.68rem", height: 20 }} />
                              </Box>
                            )}

                            {log.old_due_date && log.new_due_date && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Due Date:
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#f44336", textDecoration: "line-through" }}>
                                  {new Date(log.old_due_date).toLocaleDateString()}
                                </Typography>
                                <Typography variant="caption">→</Typography>
                                <Typography variant="caption" sx={{ color: "#4caf50", fontWeight: 600 }}>
                                  {new Date(log.new_due_date).toLocaleDateString()}
                                </Typography>
                              </Box>
                            )}

                            {log.next_due_date && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Next Due:
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#1565c0" }}>
                                  {new Date(log.next_due_date).toLocaleDateString()}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < logs.length - 1 && (
                      <Box sx={{ ml: "67px", mr: 3 }}>
                        <Divider />
                      </Box>
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DocumentLogs;