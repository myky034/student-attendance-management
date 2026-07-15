import { useState, useRef, useMemo, useEffect } from "react";
import * as xlsx from "xlsx";
import Papa from "papaparse";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "./ui/dialog";
import {
  AlertCircleIcon,
  CheckCircle2,
  Download,
  FileText,
  X,
} from "lucide-react";
import { Pagination } from "./ui/pagination";
import { toast } from "sonner";
import { useAppContext } from "@/context/useAppContext";
import { cn } from "@/lib/utils";
import { getUsers } from "@/lib/api/user";
import { importStudents } from "@/lib/api/students";
import { getClasses, type ClassOption } from "@/lib/api/classes";
import { useAuditContext } from "@/hooks/useAuditContext";
import {
  buildImportPreviewRows,
  downloadImportTemplate,
  generatePassword,
  generateQRCode,
  isSupportedImportFile,
  parseRawImportRows,
  validateImportClassGrade,
  validateImportNames,
  type ImportPreviewRow,
} from "@/lib/importStudents";

const ITEMS_PER_PAGE = 10;

function ImportCellValue({
  value,
  isGenerated,
}: {
  value: string;
  isGenerated: boolean;
}) {
  if (!isGenerated) {
    return <span className="text-zinc-900 dark:text-zinc-100">{value}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1",
        "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200",
        "dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-700/60",
      )}
      title="System generated"
    >
      <span className="truncate font-medium">{value}</span>
      <span
        className={cn(
          "shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          "bg-indigo-100 text-indigo-700",
          "dark:bg-indigo-900 dark:text-indigo-300",
        )}
      >
        Auto
      </span>
    </span>
  );
}

export function ImportUserModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "teacher",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "teacher" | "admin";
}) {
  const { user } = useAppContext();
  const audit = useAuditContext();
  const isAdminMode = mode === "admin";
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ImportPreviewRow[]>([]);
  const [importPage, setImportPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAdminMode) return;

    let cancelled = false;
    setLoadingClasses(true);

    getClasses()
      .then((data) => {
        if (!cancelled) setClasses(data);
      })
      .catch((err) => {
        console.error("Failed to load classes for import:", err);
        if (!cancelled) {
          toast.error("Cannot load class list. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isAdminMode]);

  const unresolvedRows = useMemo(
    () => parsedData.filter((row) => row.classResolveError),
    [parsedData],
  );

  const totalImportPages = Math.max(
    1,
    Math.ceil(parsedData.length / ITEMS_PER_PAGE),
  );
  const currentImportPage = Math.min(importPage, totalImportPages);
  const paginatedImportData = useMemo(
    () =>
      parsedData.slice(
        (currentImportPage - 1) * ITEMS_PER_PAGE,
        currentImportPage * ITEMS_PER_PAGE,
      ),
    [parsedData, currentImportPage],
  );

  const parseCSV = (file: File): Promise<Record<string, unknown>[]> =>
    new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data),
        error: (parseError) => reject(parseError),
      });
    });

  const parseExcel = async (file: File): Promise<Record<string, unknown>[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    return xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setParsedData([]);
    setImportPage(1);

    if (!isSupportedImportFile(file.name)) {
      setFileName(null);
      setError("Only CSV, TXT, XLSX, XLS files are supported");
      e.target.value = "";
      return;
    }

    setFileName(file.name);

    try {
      let rawRows: Record<string, unknown>[] = [];

      if (
        file.name.toLowerCase().endsWith(".csv") ||
        file.name.toLowerCase().endsWith(".txt")
      ) {
        rawRows = await parseCSV(file);
      } else {
        rawRows = await parseExcel(file);
      }

      if (rawRows.length === 0) {
        setFileName(null);
        setError("File has no data");
        return;
      }

      const parsedRows = parseRawImportRows(rawRows);
      const { validRows, invalidRowNumbers } = validateImportNames(parsedRows);

      if (invalidRowNumbers.length > 0) {
        setFileName(null);
        setError(
          `Column Name cannot be empty (row: ${invalidRowNumbers.join(", ")})`,
        );
        return;
      }

      if (validRows.length === 0) {
        setFileName(null);
        setError("No valid students found in the file");
        return;
      }

      if (isAdminMode) {
        const classGradeCheck = validateImportClassGrade(validRows);
        if (classGradeCheck.invalidRowNumbers.length > 0) {
          setFileName(null);
          setError(
            `Columns class and grade are required (row: ${classGradeCheck.invalidRowNumbers.join(", ")})`,
          );
          return;
        }
      }

      const classList = isAdminMode ? classes : [];
      if (isAdminMode && classList.length === 0) {
        setFileName(null);
        setError("Class list is not loaded yet. Please try again.");
        return;
      }

      const existingUsers = await getUsers();
      const previewRows = buildImportPreviewRows(
        validRows,
        existingUsers.map((item) => item.email),
        existingUsers.map((item) => item.username),
        classList,
        isAdminMode,
      );

      setParsedData(previewRows);
    } catch (err) {
      console.error("File parse error:", err);
      setFileName(null);
      setParsedData([]);
      setError("Cannot read file. Please check the format.");
    } finally {
      e.target.value = "";
    }
  };

  const handleConfirm = async () => {
    if (parsedData.length === 0) return;

    if (!isAdminMode && !user?.classId) {
      toast.error(
        user?.role === "teacher"
          ? "Teacher has not been assigned a class (classId)"
          : "Account has no classId to import students",
      );
      return;
    }

    if (isAdminMode && unresolvedRows.length > 0) {
      toast.error(
        `Cannot import: ${unresolvedRows.length} row(s) have invalid class/grade mapping`,
      );
      return;
    }

    setSubmitting(true);

    try {
      const existingUsers = await getUsers();
      const classList = isAdminMode ? classes : [];

      const rowsToImport = buildImportPreviewRows(
        parsedData.map((row) => ({
          name: row.name,
          holy_name: row.holy_name,
          email: row.isEmailGenerated ? "" : row.email,
          username: row.isUsernameGenerated ? "" : row.username,
          role: row.role,
          class: row.class,
          grade: row.grade,
        })),
        existingUsers.map((item) => item.email),
        existingUsers.map((item) => item.username),
        classList,
        isAdminMode,
      );

      if (isAdminMode && rowsToImport.some((row) => row.classResolveError)) {
        toast.error("Some rows have invalid class/grade. Please fix the file.");
        return;
      }

      await importStudents(
        rowsToImport.map((row) => ({
          name: row.name,
          holy_name: row.holy_name,
          email: row.email,
          username: row.username,
          password: generatePassword(),
          qrCode: generateQRCode(),
          classId: isAdminMode ? (row.classId as string) : user!.classId!,
          isActive: true,
          isLocked: false,
        })),
        audit ?? undefined,
      );

      toast.success(`Imported ${rowsToImport.length} student(s) successfully`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Import students error:", err);
      toast.error("Import failed. Check duplicate email/username data.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setParsedData([]);
    setImportPage(1);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleRemoveFile();
    onClose();
  };

  const renderPreviewRow = (row: ImportPreviewRow, index: number) => (
    <>
      <p className="font-semibold text-base">{row.name}</p>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">#:</span>{" "}
          {(currentImportPage - 1) * ITEMS_PER_PAGE + index + 1}
        </p>
        <p>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Holy Name:
          </span>{" "}
          {row.holy_name || "-"}
        </p>
        <p className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Email:
          </span>{" "}
          <ImportCellValue value={row.email} isGenerated={row.isEmailGenerated} />
        </p>
        <p className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Username:
          </span>{" "}
          <ImportCellValue
            value={row.username}
            isGenerated={row.isUsernameGenerated}
          />
        </p>
        {isAdminMode && (
          <>
            <p>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Class:
              </span>{" "}
              {row.class || "-"}
            </p>
            <p>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Grade:
              </span>{" "}
              {row.grade || "-"}
            </p>
            {row.classResolveError && (
              <p className="text-red-600 dark:text-red-400">
                {row.classResolveError}
              </p>
            )}
          </>
        )}
        <p>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Role:
          </span>{" "}
          <span className="capitalize">{row.role}</span>
        </p>
      </div>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="
          flex w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden
          p-4 sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:p-5
          md:max-w-4xl lg:max-w-5xl xl:max-w-6xl
          max-h-[92dvh] sm:max-h-[88vh]
        "
      >
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            {isAdminMode
              ? "Upload CSV or Excel. Required columns: name, class, grade. Optional: holy_name, email, username."
              : "Upload CSV or Excel file."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-2 sm:gap-4 sm:py-3">
          {isAdminMode && (
            <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="text-sm text-amber-900 dark:text-amber-200">
                <p className="font-medium">Required columns</p>
                <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
                  name, class, grade — Optional: holy_name, email, username
                </p>
              </div>
              <button
                type="button"
                onClick={downloadImportTemplate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
              >
                <Download size={16} />
                Download Template
              </button>
            </div>
          )}

          {!fileName ? (
            <div
              className="flex min-h-[220px] flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center transition-colors hover:bg-zinc-50 sm:min-h-[280px] sm:p-10 md:p-12 dark:border-zinc-700 dark:hover:bg-zinc-900/50"
              onClick={() => !loadingClasses && fileInputRef.current?.click()}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <FileText size={32} />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {loadingClasses && isAdminMode
                  ? "Loading class list..."
                  : "Click to upload a file"}
              </h3>
              <p className="max-w-md text-zinc-500 dark:text-zinc-400">
                Supported files: CSV, TXT, XLSX, XLS.
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:mb-4 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {fileName}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {parsedData.length > 0
                        ? `${parsedData.length} student(s) ready to import`
                        : "Parsing..."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="min-h-11 min-w-11 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Remove file"
                >
                  <X size={20} />
                </button>
              </div>

              {error ? (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircleIcon className="mt-0.5 shrink-0" size={20} />
                  <p>{error}</p>
                </div>
              ) : (
                parsedData.length > 0 && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs sm:px-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Note:
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-800 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-700/60">
                        Highlighted value
                        <span className="rounded bg-indigo-100 px-1 py-0.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          Auto
                        </span>
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        = system generated from Name
                      </span>
                      {isAdminMode && unresolvedRows.length > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {unresolvedRows.length} row(s) with invalid class/grade
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 p-3 md:hidden">
                      {paginatedImportData.map((row, i) => (
                        <div
                          key={`${row.username}-${i}-mobile`}
                          className={cn(
                            "rounded-lg border bg-card p-4 shadow-sm dark:border-zinc-800",
                            row.classResolveError
                              ? "border-red-300 dark:border-red-800"
                              : "border-zinc-200",
                          )}
                        >
                          {renderPreviewRow(row, i)}
                        </div>
                      ))}
                    </div>
                    <div className="hidden min-h-0 flex-1 overflow-x-auto md:block">
                      <table className="min-w-[480px] w-full text-left text-sm">
                        <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                          <tr>
                            <th className="px-3 py-2.5 text-center font-semibold sm:px-4 sm:py-3">
                              #
                            </th>
                            <th className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                              Holy Name
                            </th>
                            <th className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                              Name
                            </th>
                            <th className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                              Email
                            </th>
                            <th className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                              Username
                            </th>
                            {isAdminMode && (
                              <>
                                <th className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                                  Class
                                </th>
                                <th className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                                  Grade
                                </th>
                              </>
                            )}
                            <th className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                              Role
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {paginatedImportData.map((row, i) => (
                            <tr
                              key={`${row.username}-${i}`}
                              className={cn(
                                "hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                                row.classResolveError && "bg-red-50/80 dark:bg-red-950/20",
                              )}
                            >
                              <td className="px-3 py-2.5 text-center text-zinc-500 sm:px-4 sm:py-3">
                                {(currentImportPage - 1) * ITEMS_PER_PAGE +
                                  i +
                                  1}
                              </td>
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                                {row.holy_name ? row.holy_name : "-"}
                              </td>
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                                {row.name}
                              </td>
                              <td className="max-w-[140px] truncate px-3 py-2.5 sm:px-4 sm:py-3">
                                <ImportCellValue
                                  value={row.email}
                                  isGenerated={row.isEmailGenerated}
                                />
                              </td>
                              <td className="max-w-[120px] truncate px-3 py-2.5 sm:px-4 sm:py-3">
                                <ImportCellValue
                                  value={row.username}
                                  isGenerated={row.isUsernameGenerated}
                                />
                              </td>
                              {isAdminMode && (
                                <>
                                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                                    <div>{row.class || "-"}</div>
                                    {row.classResolveError && (
                                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                        {row.classResolveError}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                                    {row.grade || "-"}
                                  </td>
                                </>
                              )}
                              <td className="px-3 py-2.5 capitalize sm:px-4 sm:py-3">
                                {row.role}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="shrink-0 border-t border-zinc-200 px-2 py-2 sm:px-4 dark:border-zinc-800">
                      <Pagination
                        currentPage={currentImportPage}
                        totalPages={totalImportPages}
                        onPageChange={setImportPage}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleFileChange}
          />
        </div>

        <DialogFooter className="mt-2 shrink-0 flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="min-h-11 w-full rounded-xl px-6 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 sm:w-auto dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              parsedData.length === 0 ||
              submitting ||
              (isAdminMode && unresolvedRows.length > 0)
            }
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <CheckCircle2 size={18} />
            {submitting ? "Importing..." : "Confirm Import"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
