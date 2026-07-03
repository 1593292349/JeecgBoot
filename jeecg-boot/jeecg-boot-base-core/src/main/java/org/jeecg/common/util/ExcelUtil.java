package org.jeecg.common.util;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.formula.ConditionalFormattingEvaluator;
import org.apache.poi.ss.usermodel.ExcelNumberFormat;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.util.LocaleUtil;
import org.apache.poi.ss.formula.WorkbookEvaluatorProvider;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.vo.LoginUser;
import org.jeecg.config.JeecgBaseConfig;
import org.jeecgframework.poi.excel.ExcelImportUtil;
import org.jeecgframework.poi.excel.annotation.Excel;
import org.jeecgframework.poi.excel.annotation.ExcelCollection;
import org.jeecgframework.poi.excel.annotation.ExcelEntity;
import org.jeecgframework.poi.excel.annotation.ExcelTarget;
import org.jeecgframework.poi.excel.def.NormalExcelConstants;
import org.jeecgframework.poi.excel.entity.ExportParams;
import org.jeecgframework.poi.excel.entity.ImportParams;
import org.jeecgframework.poi.excel.entity.enmus.ExcelType;
import org.jeecgframework.poi.excel.view.JeecgEntityExcelView;
import org.jeecgframework.poi.util.PoiPublicUtil;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.servlet.ModelAndView;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Excel 工具类
 */
@Slf4j
public class ExcelUtil{

	/**
	 * 修复 Excel 合并单元格：用每个合并区域第一个单元格的值覆盖区域内所有其他单元格
	 * <p>
	 * Excel 合并单元格后，只有第一个单元格有值，其余单元格可能残留不同的旧值。
	 * 此方法通过 POI 读取合并区域，统一使用第一个单元格的值。
	 * @param inputStream Excel 文件输入流
	 * @return 修复后的 Excel 输入流
	 */
	public static InputStream fixMergedCells(InputStream inputStream) throws Exception{
		Workbook workbook = WorkbookFactory.create(inputStream);
		try{
			Sheet sheet = workbook.getSheetAt(0);
			List<CellRangeAddress> mergedRegions = sheet.getMergedRegions();

			for(CellRangeAddress mergedRegion: mergedRegions){
				// 跳过单单元格合并区域
				if(mergedRegion.getFirstRow() == mergedRegion.getLastRow()
					&& mergedRegion.getFirstColumn() == mergedRegion.getLastColumn()){
					continue;
				}

				// 获取合并区域第一个单元格的值
				int firstRow = mergedRegion.getFirstRow();
				int firstCol = mergedRegion.getFirstColumn();
				Row firstRowObj = sheet.getRow(firstRow);
				Cell firstCell = (firstRowObj != null)
					? firstRowObj.getCell(firstCol)
					: null;

				Object value = null;
				CellType cellType = CellType.BLANK;
				if(firstCell != null){
					cellType = firstCell.getCellType();
					if(cellType == CellType.STRING){
						value = firstCell.getStringCellValue();
					}else if(cellType == CellType.NUMERIC){
						value = firstCell.getNumericCellValue();
					}else if(cellType == CellType.BOOLEAN){
						value = firstCell.getBooleanCellValue();
					}
				}

				// 用第一个单元格的值覆盖合并区域内所有其他单元格
				int lastRow = mergedRegion.getLastRow();
				int lastCol = mergedRegion.getLastColumn();
				for(int row = firstRow; row <= lastRow; row++){
					Row rowObj = sheet.getRow(row);
					if(rowObj == null){
						rowObj = sheet.createRow(row);
					}
					for(int col = firstCol; col <= lastCol; col++){
						// 跳过第一个单元格
						if(row == firstRow && col == firstCol){
							continue;
						}
						Cell cell = rowObj.getCell(col);
						if(cell == null){
							cell = rowObj.createCell(col);
						}

						fixCell(cell, cellType, value);
					}
				}
			}

			ByteArrayOutputStream bos = new ByteArrayOutputStream();
			workbook.write(bos);
			return new ByteArrayInputStream(bos.toByteArray());
		}finally{
			workbook.close();
		}
	}

	/**
	 * 修复单个单元格的值
	 */
	private static void fixCell(Cell cell, CellType cellType, Object value){
		if(cellType == CellType.STRING){
			cell.setCellType(CellType.STRING);
			cell.setCellValue(value != null
				? value.toString()
				: "");
		}else if(cellType == CellType.NUMERIC){
			cell.setCellType(CellType.NUMERIC);
			cell.setCellValue(value != null
				? (Double) value
				: 0.0);
		}else if(cellType == CellType.BOOLEAN){
			cell.setCellType(CellType.BOOLEAN);
			cell.setCellValue(value != null
				? (Boolean) value
				: false);
		}else{
			cell.setCellType(CellType.BLANK);
		}
	}

	/**
	 * 归一字典列的数值单元格
	 * <p>
	 * 解决的问题：字典 label 为纯数字时，Excel 中录入的值为数值类型，AutoPoi 读取后按 {@code String.valueOf(double)}
	 * 得到 "316.0"，与字典文本 "316" 精确比对不相等，导致 @Excel 的 dictTable/dicCode 不生效。
	 * 字典匹配应按 Excel 中看到的值（单元格显示值）进行：显示 "316" 就按 "316" 匹配，显示 "316.0" 就按 "316.0" 匹配。
	 * 只处理 String 类型字段的字典列；字典文本须与显示文本一致（自定义格式同理）。
	 * <p>
	 * 预期行为：含逗号的显示文本（千分位、货币等）按多值字典拆分，不命中字典文本；显示文本为空（隐藏零值等）时写入空串，导入后为 null。
	 * <p>
	 * 表头定位与字典列识别对齐 AutoPoi 2.0.4 的导入实现，升级 autopoi 时需重新核对，否则归一化会静默失配（不报错，只是不再改写单元格）。
	 * @param inputStream Excel 输入流（不关闭，须使用返回值继续解析）
	 * @param clazz       导入实体类
	 * @param params      导入参数
	 * @return 归一后的输入流
	 */
	public static InputStream normalizeDictCells(
		InputStream inputStream,
		Class<?> clazz,
		ImportParams params
	) throws Exception{
		Set<Integer> dictFixedColumns = new HashSet<>();
		Set<String> groupNames = new HashSet<>();
		Set<String> dictHeaders = collectDictHeaders(clazz, groupNames, dictFixedColumns);
		if(dictHeaders.isEmpty() && dictFixedColumns.isEmpty()){
			return inputStream;
		}

		byte[] bytes = inputStream.readAllBytes();

		Workbook workbook;
		try{
			workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes));
		}catch(Exception e){
			// 文件无法解析时不阻断导入，交由 AutoPoi 报出原有错误
			log.warn("字典列归一跳过：文件无法解析为 Excel，{}", e.toString());
			return new ByteArrayInputStream(bytes);
		}

		try(workbook){
			Map<Cell, String> changes;
			try{
				changes = collectDictCellChanges(workbook, dictHeaders, dictFixedColumns, groupNames, params);
			}catch(RuntimeException e){
				log.warn("字典列归一跳过：无法识别表头或收集待改单元格，{}", e.toString());
				return new ByteArrayInputStream(bytes);
			}
			if(changes.isEmpty()){
				return new ByteArrayInputStream(bytes);
			}
			try{
				// 在原始工作簿上算完显示值后再改写，避免影响条件格式引用的单元格。
				int[] writtenCount = {0};
				changes.forEach((cell, value) -> {
					try{
						// 公式格先清空再写文本。不能用 removeFormula：HSSF 下它会留下未登记到行的记录，
						// 随后 setCellValue 抛 IllegalStateException，导致 .xls 的公式格静默漏改。
						if(cell.getCellType() == CellType.FORMULA){
							cell.setBlank();
						}
						cell.setCellValue(value);
						writtenCount[0]++;
					}catch(RuntimeException e){
						// 单格改写失败（如多格数组公式）只跳过该格，不影响其它列
						log.debug("字典列归一跳过单元格 {}({}列)：{}", cell.getRowIndex(), cell.getColumnIndex(), e.toString());
					}
				});
				ByteArrayOutputStream bos = new ByteArrayOutputStream(bytes.length);
				workbook.write(bos);
				log.debug("字典列数值单元格已归一为文本：{} 个", writtenCount[0]);
				return new ByteArrayInputStream(bos.toByteArray());
			}catch(Exception e){
				log.warn("字典列归一跳过：无法写回 Excel，{}", e.toString());
				return new ByteArrayInputStream(bytes);
			}
		}
	}

	/**
	 * 收集 AutoPoi 实际导入的字典列表头名和固定列索引
	 */
	private static Set<String> collectDictHeaders(
		Class<?> clazz,
		Set<String> groupNames,
		Set<Integer> dictFixedColumns
	){
		Set<String> headers = new HashSet<>();
		ExcelTarget excelTarget = clazz.getAnnotation(ExcelTarget.class);
		String targetId = excelTarget == null ? null : excelTarget.value();
		collectDictHeaders(
			PoiPublicUtil.getClassFields(clazz), targetId, "", false, headers, groupNames, dictFixedColumns
		);
		return headers;
	}

	private static void collectDictHeaders(
		Field[] fields,
		String targetId,
		String prefix,
		boolean collectionFields,
		Set<String> headers,
		Set<String> groupNames,
		Set<Integer> dictFixedColumns
	){
		for(Field field: fields){
			if(PoiPublicUtil.isNotUserExcelUserThis(null, field, targetId)){
				continue;
			}
			if(PoiPublicUtil.isCollection(field.getType())){
				ExcelCollection excelCollection = field.getAnnotation(ExcelCollection.class);
				if(excelCollection == null || !(field.getGenericType() instanceof ParameterizedType parameterizedType)){
					continue;
				}
				Class<?> itemClass = (Class<?>)parameterizedType.getActualTypeArguments()[0];
				collectDictHeaders(
					PoiPublicUtil.getClassFields(itemClass), targetId, excelCollection.name() + "_", true,
					headers, groupNames, dictFixedColumns
				);
				continue;
			}
			if(PoiPublicUtil.isJavaClass(field)){
				Excel excel = field.getAnnotation(Excel.class);
				if(excel == null){
					continue;
				}
				// AutoPoi 导入前用顶层 @Excel 的 groupName 填充 ignoreHeaderList，命中时丢弃分组前缀
				if(!collectionFields && oConvertUtils.isNotEmpty(excel.groupName())){
					groupNames.add(excel.groupName());
				}
				if(field.getType() != String.class || oConvertUtils.isEmpty(excel.dicCode())){
					continue;
				}
				if(excel.fixedIndex() >= 0){
					if(prefix.isEmpty() && !collectionFields){
						dictFixedColumns.add(excel.fixedIndex());
					}
					continue;
				}
				String excelName = resolveExcelName(excel.name(), targetId);
				if(oConvertUtils.isNotEmpty(excelName)){
					headers.add(prefix + excelName);
				}
				continue;
			}
			ExcelEntity excelEntity = field.getAnnotation(ExcelEntity.class);
			String nestedPrefix = prefix;
			if(!collectionFields && excelEntity != null && excelEntity.show()){
				nestedPrefix += excelEntity.name() + "_";
			}
			collectDictHeaders(
				PoiPublicUtil.getClassFields(field.getType()), targetId, nestedPrefix, collectionFields,
				headers, groupNames, dictFixedColumns
			);
		}
	}

	private static String resolveExcelName(String excelName, String targetId){
		if(excelName.indexOf('_') < 0 || targetId == null || targetId.isBlank()){
			return excelName;
		}
		for(String name: excelName.split(",")){
			if(name.contains(targetId)){
				return name.replace("_" + targetId, "");
			}
		}
		return null;
	}

	private static Map<Cell, String> collectDictCellChanges(
		Workbook workbook,
		Set<String> dictHeaders,
		Set<Integer> dictFixedColumns,
		Set<String> groupNames,
		ImportParams params
	){
		int sheetCount = workbook.getNumberOfSheets();
		int startIndex = params.getStartSheetIndex();
		int sheetNum = params.getSheetNum() > 0
			? params.getSheetNum()
			: sheetCount;
		// 固定中文 locale，避免服务器 locale 影响数字渲染（如德语把小数点渲染成逗号）
		Map<Locale, DataFormatter> formatters = new HashMap<>();
		FormulaEvaluator formulaEvaluator = workbook.getCreationHelper().createFormulaEvaluator();
		ConditionalFormattingEvaluator conditionalFormattingEvaluator = new ConditionalFormattingEvaluator(
			workbook,
			(WorkbookEvaluatorProvider) formulaEvaluator
		);
		Map<Cell, String> changes = new HashMap<>();
		for(int index = startIndex; index < startIndex + sheetNum && index < sheetCount; index++){
			Sheet sheet = workbook.getSheetAt(index);
			if(oConvertUtils.isNotEmpty(params.getSheetName())
				&& !params.getSheetName().equals(sheet.getSheetName())){
				continue;
			}
			collectSheetDictCellChanges(
				sheet,
				dictHeaders,
				dictFixedColumns,
				groupNames,
				params,
				formatters,
				conditionalFormattingEvaluator,
				formulaEvaluator,
				changes
			);
		}
		return changes;
	}

	/**
	 * 收集单个工作表里待改写的字典列数值单元格；表头行、数据起始行按 ExcelImportServer 的规则定位
	 */
	private static void collectSheetDictCellChanges(
		Sheet sheet,
		Set<String> dictHeaders,
		Set<Integer> dictFixedColumns,
		Set<String> groupNames,
		ImportParams params,
		Map<Locale, DataFormatter> formatters,
		ConditionalFormattingEvaluator conditionalFormattingEvaluator,
		FormulaEvaluator formulaEvaluator,
		Map<Cell, String> changes
	){
		int titleRows = params.getTitleRows();
		Row headerRow = findHeaderRow(sheet, titleRows);
		if(headerRow == null){
			return;
		}

		List<CellRangeAddress> mergedRegions = sheet.getMergedRegions();
		int headRows = findMergedRegion(mergedRegions, headerRow.getRowNum(), 0) != null
			? 2
			: 1;
		List<Integer> dictColumns = findDictColumns(
			sheet, headerRow, headRows, dictHeaders, dictFixedColumns, groupNames, mergedRegions
		);
		if(dictColumns.isEmpty()){
			return;
		}

		boolean use1904Windowing = isUse1904Windowing(sheet.getWorkbook());
		boolean displayZeros = sheet.isDisplayZeros();
		for(int rowNum = titleRows + headRows; rowNum <= sheet.getLastRowNum(); rowNum++){
			Row row = sheet.getRow(rowNum);
			if(row == null){
				continue;
			}
			for(int col: dictColumns){
				try{
					collectDictCellChange(
						row.getCell(col), formatters, use1904Windowing, displayZeros,
						conditionalFormattingEvaluator, formulaEvaluator, changes
					);
				}catch(RuntimeException e){
					// 单格解析失败不阻断整份文件，该格保持原值
					log.debug("字典列归一跳过单元格 {}({}列)：{}", rowNum, col, e.toString());
				}
			}
		}
	}

	/**
	 * 找字典列：多行表头按 ExcelImportServer 的规则解析分组名和字段标签
	 */
	private static List<Integer> findDictColumns(
		Sheet sheet,
		Row headerRow,
		int headRows,
		Set<String> dictHeaders,
		Set<Integer> dictFixedColumns,
		Set<String> groupNames,
		List<CellRangeAddress> mergedRegions
	){
		Map<Integer, String> headerTexts = new HashMap<>();
		for(Cell cell: headerRow){
			headerTexts.put(cell.getColumnIndex(), cellText(cell));
		}
		if(headRows > 1){
			Row labelRow = sheet.getRow(headerRow.getRowNum() + headRows - 1);
			if(labelRow != null){
				for(Cell cell: labelRow){
					String label = cellText(cell);
					if(oConvertUtils.isNotEmpty(label)){
						int col = cell.getColumnIndex();
						String topLabel = headerTexts.get(col);
						CellRangeAddress region = findMergedRegion(mergedRegions, headerRow.getRowNum(), col);
						if(region != null){
							Row groupRow = sheet.getRow(region.getFirstRow());
							Cell groupCell = groupRow == null ? null : groupRow.getCell(region.getFirstColumn());
							topLabel = org.jeecgframework.poi.util.ExcelUtil.getCellValue(groupCell);
							// 与 AutoPoi 一致：命中顶层 @Excel(groupName) 时丢弃分组前缀。
							// AutoPoi 的 ignoreHeaderList 在导入阶段才由 groupName 填充（覆盖式 set），归一阶段没有该列表。
							if(groupNames.contains(topLabel)){
								topLabel = null;
							}
						}
						// 分组单元格为空时不加前缀：AutoPoi 此时拼出 "_字段"，不会命中任何字段，该列本就不会被导入
						if(oConvertUtils.isNotEmpty(topLabel)){
							label = topLabel + "_" + label;
						}
						headerTexts.put(col, label);
					}
				}
			}
		}
		List<Integer> dictColumns = new ArrayList<>(dictFixedColumns);
		for(Map.Entry<Integer, String> entry: headerTexts.entrySet()){
			if(dictHeaders.contains(entry.getValue())
				&& !dictColumns.contains(entry.getKey())){
				dictColumns.add(entry.getKey());
			}
		}
		return dictColumns;
	}

	/**
	 * 收集数值单元格（包括公式的数值结果）的待改写文本
	 */
	private static void collectDictCellChange(
		Cell cell,
		Map<Locale, DataFormatter> formatters,
		boolean use1904Windowing,
		boolean displayZeros,
		ConditionalFormattingEvaluator conditionalFormattingEvaluator,
		FormulaEvaluator formulaEvaluator,
		Map<Cell, String> changes
	){
		if(cell == null){
			return;
		}
		double value;
		boolean formulaResult = false;
		if(cell.getCellType() == CellType.NUMERIC){
			value = cell.getNumericCellValue();
		}else if(cell.getCellType() == CellType.FORMULA){
			CellValue evaluatedValue = formulaEvaluator.evaluate(cell);
			if(evaluatedValue == null || evaluatedValue.getCellType() != CellType.NUMERIC){
				return;
			}
			value = evaluatedValue.getNumberValue();
			formulaResult = true;
		}else{
			return;
		}
		String text = formatCellValue(
			cell, value, formatters, use1904Windowing, displayZeros, conditionalFormattingEvaluator
		);
		// AutoPoi 用 String.valueOf(double) 参与字典比对，文本一致则无需改写
		if(formulaResult || !text.equals(String.valueOf(value))){
			changes.put(cell, text);
		}
	}

	private static String formatCellValue(
		Cell cell,
		double value,
		Map<Locale, DataFormatter> formatters,
		boolean use1904Windowing,
		boolean displayZeros,
		ConditionalFormattingEvaluator conditionalFormattingEvaluator
	){
		if(value == 0.0 && !displayZeros){
			return "";
		}
		ExcelNumberFormat cellFormat = ExcelNumberFormat.from(cell, conditionalFormattingEvaluator);
		String formatString = cellFormat == null ? null : cellFormat.getFormat();
		// 样式没有可用的格式串时按 General 渲染，与 Excel 的默认显示一致
		if(oConvertUtils.isEmpty(formatString)){
			formatString = GENERAL_FORMAT;
		}
		int formatIndex = cellFormat == null ? 0 : cellFormat.getIdx();
		Locale formatLocale = localeFromFormat(formatString);
		if(formatLocale != null){
			formatString = LOCALE_FORMAT_PATTERN.matcher(formatString).replaceAll("$1");
		}
		DataFormatter formatter = formatters.computeIfAbsent(
			formatLocale == null ? Locale.CHINA : formatLocale,
			DataFormatter::new
		);
		// Excel 对零值只用 # 占位符时数字部分为空，字面量照常显示
		if(value == 0.0){
			String zeroText = zeroValueText(formatString);
			if(zeroText != null){
				return zeroText;
			}
		}
		return formatter.formatRawCellContents(value, formatIndex, formatString, use1904Windowing);
	}

	/**
	 * 零值的显示文本：Excel 只用 # 占位符时数字部分为空，字面量照常显示（如 #"元" 显示 元）。
	 * 含 0/? 占位符、日期时间占位符或条件段时返回 null，交由 DataFormatter 渲染。
	 */
	private static String zeroValueText(String formatString){
		List<String> sections = new ArrayList<>();
		StringBuilder section = new StringBuilder();
		boolean quoted = false;
		boolean bracketed = false;
		for(int i = 0; i < formatString.length(); i++){
			char current = formatString.charAt(i);
			if(current == '\\' || current == '_' || current == '*'){
				if(i + 1 < formatString.length()){
					section.append(current).append(formatString.charAt(++i));
				}else{
					section.append(current);
				}
				continue;
			}
			if(current == '"' && !bracketed){
				quoted = !quoted;
				section.append(current);
				continue;
			}
			if(current == '[' && !quoted){
				bracketed = true;
			}else if(current == ']' && bracketed){
				bracketed = false;
			}
			if(current == ';' && !quoted && !bracketed){
				sections.add(section.toString());
				section.setLength(0);
			}else{
				section.append(current);
			}
		}
		sections.add(section.toString());
		String zeroSection = sections.size() >= 3 ? sections.get(2) : sections.get(0);
		if(CONDITION_SECTION_PATTERN.matcher(zeroSection).find()){
			return null;
		}
		StringBuilder text = new StringBuilder();
		for(int i = 0; i < zeroSection.length(); i++){
			char current = zeroSection.charAt(i);
			if(current == '0' || current == '?' || current == '@'){
				return null;
			}
			if(current == '#' || current == ',' || current == '.'){
				continue;
			}
			if(current == '"'){
				int end = zeroSection.indexOf('"', i + 1);
				if(end < 0){
					return null;
				}
				text.append(zeroSection, i + 1, end);
				i = end;
				continue;
			}
			if(current == '\\'){
				// 转义符只输出其后的字符（如 \; 显示 ;），与 DataFormatter 去转义的行为一致
				if(i + 1 < zeroSection.length()){
					text.append(zeroSection.charAt(i + 1));
					i++;
				}
				continue;
			}
			if(current == '_' || current == '*'){
				// 对齐占位与填充符不产生可见字符，连同其后一个字符一起丢弃
				i++;
				continue;
			}
			if(current == '['){
				int end = zeroSection.indexOf(']', i + 1);
				if(end < 0){
					return null;
				}
				i = end;
				continue;
			}
			if(Character.isLetter(current)){
				// 日期时间占位符或 General，交给 DataFormatter
				return null;
			}
			text.append(current);
		}
		return text.toString();
	}

	private static final String GENERAL_FORMAT = "General";
	private static final Pattern LOCALE_FORMAT_PATTERN = Pattern.compile("\\[\\$([^\\]]*?)-([0-9A-Fa-f]+)\\]");
	/** 条件段标记，如 [>=100]、[=0]，命中时零值渲染交给 DataFormatter */
	private static final Pattern CONDITION_SECTION_PATTERN = Pattern.compile("\\[[<>=][^\\]]*\\]");

	private static Locale localeFromFormat(String formatString){
		Matcher matcher = LOCALE_FORMAT_PATTERN.matcher(formatString);
		while(matcher.find()){
			try{
				String languageTag = LocaleUtil.getLocaleFromLCID(Integer.parseInt(matcher.group(2), 16));
				if(!"invalid".equals(languageTag)){
					return Locale.forLanguageTag(languageTag);
				}
			}catch(NumberFormatException ignored){
				// Try the next locale marker in the format.
			}
		}
		return null;
	}

	/**
	 * 1904 日期系统（Mac Excel）下同一序列值对应的日期差 1462 天，显示值须按工作簿设置渲染
	 */
	private static boolean isUse1904Windowing(Workbook workbook){
		if(workbook instanceof XSSFWorkbook xssfWorkbook){
			return xssfWorkbook.isDate1904();
		}
		return workbook instanceof HSSFWorkbook hssfWorkbook
			&& hssfWorkbook.getInternalWorkbook().isUsing1904DateWindowing();
	}

	private static CellRangeAddress findMergedRegion(List<CellRangeAddress> mergedRegions, int rowNum, int columnIndex){
		for(CellRangeAddress region: mergedRegions){
			if(region.isInRange(rowNum, columnIndex)){
				return region;
			}
		}
		return null;
	}

	private static Row findHeaderRow(Sheet sheet, int titleRows){
		int headBegin = titleRows;
		int allRowNum = sheet.getPhysicalNumberOfRows();
		Row headerRow = null;
		while(headerRow == null && headBegin < allRowNum){
			headerRow = sheet.getRow(headBegin++);
		}
		return headerRow;
	}

	private static String cellText(Cell cell){
		if(cell == null){
			return null;
		}
		if(cell.getCellType() == CellType.STRING){
			return cell.getStringCellValue().trim();
		}
		if(cell.getCellType() == CellType.BOOLEAN){
			return String.valueOf(cell.getBooleanCellValue());
		}
		if(cell.getCellType() == CellType.NUMERIC){
			return String.valueOf(cell.getNumericCellValue());
		}
		if(cell.getCellType() == CellType.FORMULA){
			return cell.getCellFormula().trim();
		}
		return null;
	}

	/**
	 * 通用 Excel 导入方法
	 * <p>
	 * 导入前总会执行字典列数值单元格归一；fixMerged 只控制是否额外修复合并单元格。
	 * @param request   HTTP请求
	 * @param response  HTTP响应（暂未使用）
	 * @param clazz     导入数据的实体类
	 * @param handler   数据处理函数，接收导入的数据列表，返回处理结果字符串
	 * @param fixMerged 是否修复合并单元格（字典列归一不受此参数影响）
	 * @return 导入结果
	 */
	public static <T> Result<?> importExcel(
		HttpServletRequest request,
		HttpServletResponse response,
		Class<T> clazz,
		Function<List<T>, String> handler,
		boolean fixMerged
	){
		MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
		Map<String, MultipartFile> fileMap = multipartRequest.getFileMap();
		for(Map.Entry<String, MultipartFile> entity: fileMap.entrySet()){
			MultipartFile file = entity.getValue();
			ImportParams params = new ImportParams();
			params.setTitleRows(2);
			params.setHeadRows(1);
			params.setNeedSave(false);
			InputStream fileStream = null;
			try{
				fileStream = file.getInputStream();
				InputStream inputStream = fixMerged
					? fixMergedCells(fileStream)
					: fileStream;
				inputStream = normalizeDictCells(
					inputStream,
					clazz,
					params
				);
				List<T> list = ExcelImportUtil.importExcel(inputStream, clazz, params);
				String result = handler.apply(list);
				return Result.OK(result);
			}catch(Exception e){
				String msg = e.getMessage();
				log.error(msg, e);
				if(msg != null && msg.contains("Duplicate entry")){
					return Result.error("文件导入失败:有重复数据！");
				}else{
					return Result.error("文件导入失败:" + msg);
				}
			}finally{
				if(fileStream != null){
					try{
						fileStream.close();
					}catch(IOException e){
						e.printStackTrace();
					}
				}
			}
		}
		return Result.error("文件导入失败！");
	}

	/**
	 * 通用 Excel 导出方法
	 * @param exportList 导出数据列表
	 * @param clazz      导出数据的实体类
	 * @param title      导出文件名/标题
	 * @return ModelAndView
	 */
	public static <T> ModelAndView exportXls(
		List<T> exportList,
		Class<T> clazz,
		String title
	){
		LoginUser sysUser = LoginUserUtils.getSessionUser();
		ModelAndView mv = new ModelAndView(new JeecgEntityExcelView());
		mv.addObject(NormalExcelConstants.FILE_NAME, title);
		mv.addObject(NormalExcelConstants.CLASS, clazz);
		ExportParams exportParams = new ExportParams(
			title + "报表",
			"导出人:" + sysUser.getRealname(),
			title,
			ExcelType.XSSF
		);
		JeecgBaseConfig jeecgBaseConfig = SpringContextUtils.getBean(JeecgBaseConfig.class);
		exportParams.setImageBasePath(jeecgBaseConfig.getPath().getUpload());
		mv.addObject(NormalExcelConstants.PARAMS, exportParams);
		mv.addObject(NormalExcelConstants.DATA_LIST, exportList);
		return mv;
	}
}