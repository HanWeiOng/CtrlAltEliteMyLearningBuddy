"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface Topic {
  topic_label: string;
  wrong_ratio: number;
}

interface PaperDemographic {
  level: string;
  count: number;
}

export default function DataVisualisationD3() {
  const svgRef = useRef<SVGSVGElement | null>(null); // For hardest topic
  const paperSvgRef = useRef<SVGSVGElement | null>(null); // For paper demographic
  const [hardestTopicBarData, setHardestTopicBarData] = useState<Topic[]>([]);
  const [paperDemographicBarData, setPaperDemographicBarData] = useState<PaperDemographic[]>([]);

  const fetchHardestTopic = async () => {
    try {
      const response = await fetch("http://localhost:5003/api/visualisationGraph/getHardestTopic");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const parsedData: Topic[] = data.map((item: any) => ({
        ...item,
        wrong_ratio: parseFloat(item.wrong_ratio),
      }));
      setHardestTopicBarData(parsedData);
    } catch (error) {
      console.error("Error occurred while making the request:", error);
    }
  };

  const fetchPaperDemographic  = async () => {
    try {
      const response = await fetch("http://localhost:5003/api/visualisationGraph/getPaperDemographic");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const parsedData: PaperDemographic[] = data.map((item: any) => ({
        level: item.level,
        count: parseInt(item.count, 10),
      }));
      setPaperDemographicBarData(parsedData);
    } catch (error) {
      console.error("Error occurred while making the request:", error);
    }
  };

  useEffect(() => {
    fetchHardestTopic();
    fetchPaperDemographic();
  }, []);

  useEffect(() => {
    if (hardestTopicBarData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 500;
    const margin = { top: 60, right: 30, bottom: 180, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const chart = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(hardestTopicBarData.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(hardestTopicBarData.map(d => d.wrong_ratio))!])
      .nice()
      .range([innerHeight, 0]);

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(hardestTopicBarData.map(d => d.wrong_ratio))!]);

    // Bars
    chart
      .selectAll("rect")
      .data(hardestTopicBarData)
      .join("rect")
      .attr("x", (_, i) => xScale(i.toString())!)
      .attr("y", d => yScale(d.wrong_ratio))
      .attr("width", xScale.bandwidth())
      .attr("height", d => {
        const y = yScale(d.wrong_ratio);
        return isNaN(y) ? 0 : innerHeight - y;
      })
      .attr("fill", d => colorScale(d.wrong_ratio));

    // Bar value labels
    chart
      .selectAll("text.bar-label")
      .data(hardestTopicBarData)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", (_, i) => xScale(i.toString())! + xScale.bandwidth() / 2)
      .attr("y", d => {
        const y = yScale(d.wrong_ratio);
        return isNaN(y) ? innerHeight : y - 6;
      })
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .style("font-size", "12px")
      .text(d => (d.wrong_ratio * 100).toFixed(0) + "%");

    // X Axis
    chart
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickFormat((_, i) => hardestTopicBarData[i].topic_label)
      )
      .selectAll("text")
      .attr("transform", "rotate(-65)")
      .attr("x", -5)
      .attr("y", 10)
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .attr("fill", "#f0f0f0"); // x-axis text color

    // Y Axis
    chart.append("g")
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat(d => `${(d as number * 100).toFixed(0)}%`)
      )
      .selectAll("text")
      .attr("fill", "#f0f0f0") // y-axis text color
      .style("font-size", "12px");

    // Set axis lines color
    svg.selectAll(".domain, .tick line")
      .attr("stroke", "#888");

    // Chart Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .attr("fill", "#f0f0f0")
      .text("Hardest Quiz Topics by Wrong Answer Ratio");

    // Y-axis label
    svg.append("text")
      .attr("transform", `translate(${margin.left / 3}, ${height / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .attr("fill", "#f0f0f0")
      .text("Count");

  }, [hardestTopicBarData]);

  useEffect(() => {
    if (paperDemographicBarData.length === 0) return;

    const svg = d3.select(paperSvgRef.current);
    svg.selectAll("*").remove();

    const width = 500;
    const height = 300;
    const margin = { top: 40, right: 30, bottom: 80, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const chart = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(paperDemographicBarData.map(d => d.level))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(paperDemographicBarData, d => d.count)!])
      .nice()
      .range([innerHeight, 0]);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    chart
      .selectAll("rect")
      .data(paperDemographicBarData)
      .join("rect")
      .attr("x", d => xScale(d.level)!)
      .attr("y", d => yScale(d.count))
      .attr("width", xScale.bandwidth())
      .attr("height", d => innerHeight - yScale(d.count))
      .attr("fill", (_, i) => color(i.toString()));

    chart
      .selectAll("text.label")
      .data(paperDemographicBarData)
      .join("text")
      .attr("class", "label")
      .attr("x", d => xScale(d.level)! + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.count) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .style("font-size", "12px")
      .text(d => d.count);

    chart.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("fill", "#f0f0f0")
      .style("font-size", "12px");

    chart.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll("text")
      .attr("fill", "#f0f0f0")
      .style("font-size", "12px");

    chart.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("fill", "#f0f0f0")
      .text("Paper Demographic Distribution");

    svg.selectAll(".domain, .tick line").attr("stroke", "#888");
  }, [paperDemographicBarData]);

  return (
    <div>
      <div style={{
        padding: "30px",
        backgroundColor: "#111",
        borderRadius: "12px",
        maxWidth: "1000px",
        margin: "40px auto",
        boxShadow: "0 0 20px rgba(255,255,255,0.05)"
      }}>
        <svg ref={svgRef}></svg>
      </div>

      <div style={{
        padding: "30px",
        backgroundColor: "#111",
        borderRadius: "12px",
        maxWidth: "600px",
        margin: "40px auto",
        boxShadow: "0 0 20px rgba(255,255,255,0.05)"
      }}>
        <svg ref={paperSvgRef}></svg>
      </div>
    </div>
  );
}
