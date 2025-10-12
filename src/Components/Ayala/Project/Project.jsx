import React, { useEffect, useState } from 'react'
import HandleCanva from './HandleCanva'
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

export default function Project() {
const [iconPositions, setIconPositions] = useState([])
function getAllPois(){
  return axios.get('http://localhost:8000/api/v1/project/1');
}
const {data, isLoading, isError} = useQuery({
  queryKey: ['pois'],
  queryFn: getAllPois,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
})
useEffect(() => {
  if(data){
    const filteredPois = data.data.data.pois.filter(poi => poi.type === 's');
    setIconPositions(filteredPois);
  }
},[data]);
  return <>
  {isLoading && iconPositions ? <>Loading...</> : isError ? <>Error fetching data</> :
  // <HandleCanva iconPositions={iconPositions} imgSrc={data?.data.data.images[0].image_url} />
  <HandleCanva iconPositions={iconPositions} imgSrc={`./assets/image/snazzy-image 1.svg`} />
  }
  </>
}
