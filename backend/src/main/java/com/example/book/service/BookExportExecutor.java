package com.example.book.service;

import com.example.book.dto.BookExportRequest;
import com.example.book.entity.Book;
import com.example.book.entity.ExportTask;
import com.example.book.mapper.BookMapper;
import com.example.book.mapper.CategoryMapper;
import com.example.book.mapper.ExportTaskMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Element;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.BaseColor;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.opencsv.CSVWriter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class BookExportExecutor {

    private static final int BATCH_SIZE = 100;

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private ExportTaskMapper exportTaskMapper;

    @Autowired
    private ObjectMapper objectMapper;

    public void executeExport(ExportTask task, String filePath) throws Exception {
        BookExportRequest request = parseFilterParams(task.getFilterParams());
        long totalRows = countTotalRows(request);
        task.setTotalRows(totalRows);

        String format = task.getFileFormat();
        switch (format) {
            case "CSV":
                exportCsv(task, request, filePath, totalRows);
                break;
            case "PDF":
                exportPdf(task, request, filePath, totalRows);
                break;
            case "EXCEL":
            default:
                exportExcel(task, request, filePath, totalRows);
                break;
        }
    }

    private BookExportRequest parseFilterParams(String filterParams) {
        try {
            if (filterParams != null && !filterParams.isEmpty()) {
                return objectMapper.readValue(filterParams, BookExportRequest.class);
            }
        } catch (Exception e) {
            // ignore
        }
        return new BookExportRequest();
    }

    private long countTotalRows(BookExportRequest request) {
        if (Boolean.TRUE.equals(request.getFilterByCategory()) && request.getCategoryId() != null) {
            List<Long> categoryIds = new ArrayList<>();
            categoryIds.add(request.getCategoryId());
            List<Long> descendants = categoryMapper.findAllDescendantIds(request.getCategoryId());
            if (descendants != null) {
                categoryIds.addAll(descendants);
            }
            return bookMapper.countByCategoryIds(categoryIds);
        } else if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            return bookMapper.countAll();
        } else {
            return bookMapper.countAll();
        }
    }

    private List<Book> getBatch(BookExportRequest request, long offset, int limit) {
        if (Boolean.TRUE.equals(request.getFilterByCategory()) && request.getCategoryId() != null) {
            List<Long> categoryIds = new ArrayList<>();
            categoryIds.add(request.getCategoryId());
            List<Long> descendants = categoryMapper.findAllDescendantIds(request.getCategoryId());
            if (descendants != null) {
                categoryIds.addAll(descendants);
            }
            return bookMapper.findByCategoryIdsWithPagination(categoryIds, offset, limit);
        } else {
            return bookMapper.findAllWithPagination(offset, limit);
        }
    }

    private void updateProgress(Long taskId, long processedRows, long totalRows) {
        int progress = totalRows > 0 ? (int) ((processedRows * 100) / totalRows) : 0;
        if (progress > 100) progress = 100;
        exportTaskMapper.updateProgress(taskId, processedRows, progress, "PROCESSING");
    }

    private void exportExcel(ExportTask task, BookExportRequest request, String filePath, long totalRows) throws Exception {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             FileOutputStream fos = new FileOutputStream(filePath)) {

            Sheet sheet = workbook.createSheet("图书数据");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {"ID", "书名", "作者", "分类", "价格", "出版日期", "总库存", "可借库存", "预警阈值", "平均评分", "评论数", "描述"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            long processed = 0;
            int rowNum = 1;
            for (long offset = 0; offset < totalRows; offset += BATCH_SIZE) {
                List<Book> batch = getBatch(request, offset, BATCH_SIZE);
                for (Book book : batch) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(book.getId() != null ? book.getId() : 0);
                    row.createCell(1).setCellValue(book.getTitle() != null ? book.getTitle() : "");
                    row.createCell(2).setCellValue(book.getAuthor() != null ? book.getAuthor() : "");
                    row.createCell(3).setCellValue(book.getCategoryName() != null ? book.getCategoryName() : "未分类");
                    row.createCell(4).setCellValue(book.getPrice() != null ? book.getPrice().doubleValue() : 0);
                    row.createCell(5).setCellValue(book.getPublishDate() != null ? book.getPublishDate().toString() : "");
                    row.createCell(6).setCellValue(book.getTotalStock() != null ? book.getTotalStock() : 0);
                    row.createCell(7).setCellValue(book.getAvailableStock() != null ? book.getAvailableStock() : 0);
                    row.createCell(8).setCellValue(book.getWarnThreshold() != null ? book.getWarnThreshold() : 0);
                    row.createCell(9).setCellValue(book.getAvgRating() != null ? book.getAvgRating().doubleValue() : 0);
                    row.createCell(10).setCellValue(book.getReviewCount() != null ? book.getReviewCount() : 0);
                    row.createCell(11).setCellValue(book.getDescription() != null ? book.getDescription() : "");
                }
                processed += batch.size();
                updateProgress(task.getId(), processed, totalRows);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.setColumnWidth(i, 15 * 256);
            }

            workbook.write(fos);
            workbook.dispose();
        }
    }

    private void exportCsv(ExportTask task, BookExportRequest request, String filePath, long totalRows) throws Exception {
        try (BufferedWriter writer = new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(filePath), StandardCharsets.UTF_8));
             CSVWriter csvWriter = new CSVWriter(writer)) {

            String[] bom = {"\uFEFF"};
            csvWriter.writeNext(bom);

            String[] headers = {"ID", "书名", "作者", "分类", "价格", "出版日期", "总库存", "可借库存", "预警阈值", "平均评分", "评论数", "描述"};
            csvWriter.writeNext(headers);

            long processed = 0;
            for (long offset = 0; offset < totalRows; offset += BATCH_SIZE) {
                List<Book> batch = getBatch(request, offset, BATCH_SIZE);
                for (Book book : batch) {
                    String[] row = {
                        book.getId() != null ? String.valueOf(book.getId()) : "",
                        book.getTitle() != null ? book.getTitle() : "",
                        book.getAuthor() != null ? book.getAuthor() : "",
                        book.getCategoryName() != null ? book.getCategoryName() : "未分类",
                        book.getPrice() != null ? book.getPrice().toString() : "",
                        book.getPublishDate() != null ? book.getPublishDate().toString() : "",
                        book.getTotalStock() != null ? String.valueOf(book.getTotalStock()) : "",
                        book.getAvailableStock() != null ? String.valueOf(book.getAvailableStock()) : "",
                        book.getWarnThreshold() != null ? String.valueOf(book.getWarnThreshold()) : "",
                        book.getAvgRating() != null ? book.getAvgRating().toString() : "",
                        book.getReviewCount() != null ? String.valueOf(book.getReviewCount()) : "",
                        book.getDescription() != null ? book.getDescription() : ""
                    };
                    csvWriter.writeNext(row);
                }
                processed += batch.size();
                updateProgress(task.getId(), processed, totalRows);
            }
        }
    }

    private void exportPdf(ExportTask task, BookExportRequest request, String filePath, long totalRows) throws Exception {
        Document document = new Document(PageSize.A4.rotate(), 20, 20, 30, 30);
        PdfWriter.getInstance(document, new FileOutputStream(filePath));
        document.open();

        BaseFont baseFont = BaseFont.createFont("STSong-Light", "UniGB-UCS2-H", BaseFont.NOT_EMBEDDED);
        com.itextpdf.text.Font titleFont = new com.itextpdf.text.Font(baseFont, 16, com.itextpdf.text.Font.BOLD);
        com.itextpdf.text.Font headerFont = new com.itextpdf.text.Font(baseFont, 10, com.itextpdf.text.Font.BOLD);
        com.itextpdf.text.Font contentFont = new com.itextpdf.text.Font(baseFont, 9);

        Paragraph title = new Paragraph("图书数据报表", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        PdfPTable table = new PdfPTable(12);
        table.setWidthPercentage(100);

        String[] headers = {"ID", "书名", "作者", "分类", "价格", "出版日期", "总库存", "可借库存", "预警阈值", "平均评分", "评论数", "描述"};
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setBackgroundColor(BaseColor.LIGHT_GRAY);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(5);
            table.addCell(cell);
        }

        long processed = 0;
        for (long offset = 0; offset < totalRows; offset += BATCH_SIZE) {
            List<Book> batch = getBatch(request, offset, BATCH_SIZE);
            for (Book book : batch) {
                table.addCell(new PdfPCell(new Phrase(book.getId() != null ? String.valueOf(book.getId()) : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getTitle() != null ? book.getTitle() : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getAuthor() != null ? book.getAuthor() : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getCategoryName() != null ? book.getCategoryName() : "未分类", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getPrice() != null ? book.getPrice().toString() : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getPublishDate() != null ? book.getPublishDate().toString() : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getTotalStock() != null ? String.valueOf(book.getTotalStock()) : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getAvailableStock() != null ? String.valueOf(book.getAvailableStock()) : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getWarnThreshold() != null ? String.valueOf(book.getWarnThreshold()) : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getAvgRating() != null ? book.getAvgRating().toString() : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getReviewCount() != null ? String.valueOf(book.getReviewCount()) : "", contentFont)));
                table.addCell(new PdfPCell(new Phrase(book.getDescription() != null ? book.getDescription() : "", contentFont)));
            }
            processed += batch.size();
            updateProgress(task.getId(), processed, totalRows);
        }

        document.add(table);

        Paragraph footer = new Paragraph("\n共 " + totalRows + " 条记录", contentFont);
        footer.setAlignment(Element.ALIGN_RIGHT);
        document.add(footer);

        document.close();
    }
}
