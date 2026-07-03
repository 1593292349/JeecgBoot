package org.jeecg.common.util;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.shiro.SecurityUtils;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.vo.LoginUser;
import org.jeecg.config.JeecgBaseConfig;
import org.jeecgframework.poi.excel.ExcelImportUtil;
import org.jeecgframework.poi.excel.def.NormalExcelConstants;
import org.jeecgframework.poi.excel.entity.ExportParams;
import org.jeecgframework.poi.excel.entity.ImportParams;
import org.jeecgframework.poi.excel.entity.enmus.ExcelType;
import org.jeecgframework.poi.excel.view.JeecgEntityExcelView;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.servlet.ModelAndView;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

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
	 * 通用 Excel 导入方法
	 * @param request   HTTP请求
	 * @param response  HTTP响应（暂未使用）
	 * @param clazz     导入数据的实体类
	 * @param handler   数据处理函数，接收导入的数据列表，返回处理结果字符串
	 * @param fixMerged 是否修复合并单元格
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
			try{
				InputStream inputStream = fixMerged
					? fixMergedCells(file.getInputStream())
					: file.getInputStream();
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
				try{
					file.getInputStream().close();
				}catch(IOException e){
					e.printStackTrace();
				}
			}
		}
		return Result.error("文件导入失败！");
	}

	/**
	 * 通用 Excel 导出方法
	 * @param exportList    导出数据列表
	 * @param clazz         导出数据的实体类
	 * @param title         导出文件名/标题
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